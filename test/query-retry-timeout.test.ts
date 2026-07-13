import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { Query } from "../src/index.ts";

afterEach(() => {
    vi.useRealTimers();
});

function toRequest(input: RequestInfo | URL, init?: RequestInit): Request {
    return input instanceof Request ? input : new Request(input, init);
}

const pendingFetch: typeof fetch = (input, init) => {
    const request = toRequest(input, init);

    return new Promise<Response>((_resolve, reject) => {
        if (request.signal.aborted) {
            reject(request.signal.reason);
            return;
        }

        request.signal.addEventListener("abort", () => reject(request.signal.reason), { once: true });
    });
};

describe("Retry decisions", () => {
    test("Default retry handles asynchronous failures", async () => {
        vi.useFakeTimers();
        const reason = { source: "network" };
        const fetchLike = vi
            .fn<typeof fetch>()
            .mockRejectedValueOnce(reason)
            .mockRejectedValueOnce(reason)
            .mockResolvedValueOnce(new Response("ok"));
        const query = new Query(undefined, fetchLike);

        const promise = query("https://example.com/async-retry");
        await vi.advanceTimersByTimeAsync(900);

        await expect(promise).resolves.toBeInstanceOf(Response);
        expect(fetchLike).toHaveBeenCalledTimes(3);
    });

    test("Default retry does not retry POST", async () => {
        const fetchLike = vi.fn(async () => new Response("failure", { status: 500 }));
        const query = new Query(undefined, fetchLike);

        await expect(query("https://example.com/post", { method: "POST" })).rejects.toMatchObject({
            cause: { type: "http" },
        });
        expect(fetchLike).toHaveBeenCalledTimes(1);
    });

    test("Default retry does not retry an unlisted status", async () => {
        const fetchLike = vi.fn(async () => new Response("failure", { status: 400 }));
        const query = new Query(undefined, fetchLike);

        await expect(query("https://example.com/400")).rejects.toMatchObject({
            cause: { type: "http" },
        });
        expect(fetchLike).toHaveBeenCalledTimes(1);
    });

    test("Honors Retry-After zero", async () => {
        vi.useFakeTimers();
        const fetchLike = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(new Response("retry", { status: 503, headers: { "Retry-After": "0" } }))
            .mockResolvedValueOnce(new Response("ok"));
        const query = new Query(undefined, fetchLike);

        const promise = query("https://example.com/retry-after");
        await vi.advanceTimersByTimeAsync(0);

        await expect(promise).resolves.toBeInstanceOf(Response);
        expect(fetchLike).toHaveBeenCalledTimes(2);
    });

    test("Stops before a retry delay that exceeds the remaining overall timeout", async () => {
        const fetchLike = vi.fn(async () => new Response("retry", { status: 500 }));
        const query = new Query(
            {
                overallTimeout: 50,
                retry: () => ({ should: true, delay: 50 }),
            },
            fetchLike,
        );

        await expect(query("https://example.com/no-time")).rejects.toMatchObject({
            cause: { type: "timeout" },
        });
        expect(fetchLike).toHaveBeenCalledTimes(1);
    });
});

describe("Timeout and abort interactions", () => {
    test("A per-attempt timeout can retry after the configured delay", async () => {
        vi.useFakeTimers();
        let calls = 0;
        const fetchLike: typeof fetch = (input, init) => {
            calls++;
            if (calls === 2) return Promise.resolve(new Response("ok"));

            const request = toRequest(input, init);
            return new Promise<Response>((_resolve, reject) => {
                request.signal.addEventListener("abort", () => reject(request.signal.reason), {
                    once: true,
                });
            });
        };
        const query = new Query(
            {
                attemptTimeout: 10,
                overallTimeout: 1_000,
                retry: ({ no }) => (no === 1 ? { should: true, delay: 100 } : { should: false }),
            },
            fetchLike,
        );

        const promise = query("https://example.com/attempt-delay");
        await vi.advanceTimersByTimeAsync(10);
        expect(calls).toBe(1);

        await vi.advanceTimersByTimeAsync(99);
        expect(calls).toBe(1);

        await vi.advanceTimersByTimeAsync(1);
        const response = await promise;

        expect(calls).toBe(2);
        expect(await response.text()).toBe("ok");
    });

    test("User abort wins over a later per-attempt timeout", async () => {
        vi.useFakeTimers();
        const reason = { source: "user" };
        const controller = new AbortController();
        const retry = vi.fn(() => ({ should: false }) as const);
        const fetchLike = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
        const query = new Query({ attemptTimeout: 10, retry }, fetchLike);

        const promise = query("https://example.com/abort-race", { signal: controller.signal });
        const assertion = expect(promise).rejects.toBe(reason);
        await Promise.resolve();
        controller.abort(reason);
        await vi.advanceTimersByTimeAsync(10);

        await assertion;
        expect(retry).not.toHaveBeenCalled();
        expect(fetchLike).toHaveBeenCalledTimes(1);
    });

    test("User TimeoutError is not treated as a library timeout", async () => {
        const reason = new DOMException("User deadline", "TimeoutError");
        const controller = new AbortController();
        const retry = vi.fn(() => ({ should: true, delay: 0 }) as const);
        const query = new Query({ retry }, pendingFetch);

        const promise = query("https://example.com/user-timeout", { signal: controller.signal });
        const assertion = expect(promise).rejects.toBe(reason);
        await Promise.resolve();
        controller.abort(reason);

        await assertion;
        expect(retry).not.toHaveBeenCalled();
    });

    test("Overall timeout aborts the active request", async () => {
        vi.useFakeTimers();
        let seenSignal: AbortSignal | undefined;
        const fetchLike: typeof fetch = (input, init) => {
            const request = toRequest(input, init);
            seenSignal = request.signal;
            return pendingFetch(request);
        };
        const query = new Query({ attemptTimeout: Number.POSITIVE_INFINITY, overallTimeout: 10 }, fetchLike);

        const promise = query("https://example.com/overall-timeout");
        const assertion = expect(promise).rejects.toMatchObject({ cause: { type: "timeout" } });
        await vi.advanceTimersByTimeAsync(10);

        await assertion;
        expect(seenSignal).toBeDefined();
        const signal = seenSignal as AbortSignal;
        expect(signal.aborted).toBe(true);
        expect((signal.reason as InstanceType<typeof Query.Error>).cause.type).toBe("timeout");
    });

    test("A one millisecond attempt timeout settles", async () => {
        vi.useFakeTimers();
        const query = new Query({ attemptTimeout: 1, retry: () => ({ should: false }) }, pendingFetch);

        const promise = query("https://example.com/short-timeout");
        const assertion = expect(promise).rejects.toMatchObject({ cause: { type: "timeout" } });
        await vi.advanceTimersByTimeAsync(1);

        await assertion;
    });
});
