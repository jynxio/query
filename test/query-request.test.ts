import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { Query } from "../src/index.ts";

afterEach(() => {
    vi.useRealTimers();
});

describe("RequestInit semantics", () => {
    test("Preserves inherited and non-enumerable RequestInit members", async () => {
        const inheritedHeaders = new Headers({ "X-Inherited": "yes" });
        const init = Object.create({ headers: inheritedHeaders }) as RequestInit;
        Object.defineProperty(init, "method", { value: "PUT", enumerable: false });

        let seenRequest: Request | undefined;
        const query = new Query({ shouldRetry: () => false }, async (input) => {
            seenRequest = input instanceof Request ? input : new Request(input);
            return new Response("ok");
        });

        await query("https://example.com/request-init", init);

        expect(seenRequest?.method).toBe("PUT");
        expect(seenRequest?.headers.get("X-Inherited")).toBe("yes");
    });

    test("An existing Request without init remains internally unabortable", async () => {
        vi.useFakeTimers();
        let seenSignal: AbortSignal | undefined;
        const fetchLike: typeof fetch = (input) => {
            const request = input instanceof Request ? input : new Request(input);
            seenSignal = request.signal;
            return new Promise<Response>(() => {});
        };
        const query = new Query({ attemptTimeout: 1, shouldRetry: () => false }, fetchLike);

        const promise = query(new Request("https://example.com/unabortable"));
        const assertion = expect(promise).rejects.toMatchObject({ name: "TimeoutError" });
        await vi.advanceTimersByTimeAsync(1);

        await assertion;
        expect(seenSignal?.aborted).toBe(false);
    });

    test("A non-empty inherited init makes an existing Request internally abortable", async () => {
        vi.useFakeTimers();
        let seenMethod: string | undefined;
        let seenSignal: AbortSignal | undefined;
        const fetchLike: typeof fetch = (input) => {
            const request = input instanceof Request ? input : new Request(input);
            seenMethod = request.method;
            seenSignal = request.signal;
            return new Promise<Response>((_resolve, reject) => {
                request.signal.addEventListener("abort", () => reject(request.signal.reason), {
                    once: true,
                });
            });
        };
        const query = new Query({ attemptTimeout: 1, shouldRetry: () => false }, fetchLike);
        const init = Object.create({ method: "POST" }) as RequestInit;

        const promise = query(new Request("https://example.com/abortable"), init);
        const assertion = expect(promise).rejects.toMatchObject({ name: "TimeoutError" });
        await vi.advanceTimersByTimeAsync(1);

        await assertion;
        expect(seenMethod).toBe("POST");
        expect(seenSignal?.aborted).toBe(true);
    });

    test("An explicit null signal clears an inherited aborted signal", async () => {
        const controller = new AbortController();
        controller.abort({ source: "base" });
        const base = new Request("https://example.com/clear-signal", { signal: controller.signal });
        let seenSignal: AbortSignal | undefined;
        const query = new Query({ shouldRetry: () => false }, async (input) => {
            const request = input instanceof Request ? input : new Request(input);
            seenSignal = request.signal;
            return new Response("ok");
        });

        await query(base, { signal: null });

        expect(seenSignal?.aborted).toBe(false);
    });
});
