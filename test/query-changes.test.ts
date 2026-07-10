import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import type { QueryErrorCause } from "../src/_error.ts";

import { Query } from "../src/index.ts";
import { createSchema } from "./helpers/schema.ts";
import { createTextStream } from "./helpers/stream.ts";

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

function mockFetch(fn: typeof fetch) {
    return vi.spyOn(globalThis, "fetch").mockImplementation(fn);
}

async function captureQueryError(promise: unknown): Promise<InstanceType<typeof Query.Error>> {
    try {
        await promise;
    } catch (error) {
        expect(error).toBeInstanceOf(Query.Error);
        return error as InstanceType<typeof Query.Error>;
    }

    throw new Error("Expected Query.Error to be thrown");
}

function getHTTPDetails(error: InstanceType<typeof Query.Error>): QueryErrorCause["http"] {
    expect(error.cause.type).toBe("http");

    return error.cause.details as QueryErrorCause["http"];
}

describe("Public API", () => {
    test("Constructs a callable query with safe mode", () => {
        const query = new Query();

        expect(query).toBeTypeOf("function");
        expect(query.safe).toBeTypeOf("function");
        expect(Query.Error).toBeTypeOf("function");
    });
});

describe("Non-2xx errors", () => {
    test("Throw Query.Error with lazy statusError", async () => {
        mockFetch(async () => {
            return new Response(JSON.stringify({ code: "missing" }), {
                headers: { "content-type": "application/json" },
                status: 404,
                statusText: "Not Found",
            });
        });
        const query = new Query({ retry: () => ({ should: false }) });

        const error = await captureQueryError(query("https://example.com/missing"));

        const details = getHTTPDetails(error);

        expect(details.statusCode).toBe(404);
        expect(details.statusText).toBe("Not Found");
        await expect(details.statusError()).resolves.toEqual({ code: "missing" });
        await expect(details.statusError()).resolves.toEqual({ code: "missing" });
    });

    test("Reads text error bodies", async () => {
        mockFetch(async () => {
            return new Response("plain failure", {
                headers: { "content-type": "text/plain" },
                status: 500,
            });
        });
        const query = new Query({ retry: () => ({ should: false }) });

        const error = await captureQueryError(query("https://example.com/failure"));

        const details = getHTTPDetails(error);

        await expect(details.statusError()).resolves.toBe("plain failure");
    });
});

describe("Retry", () => {
    test("Retries default GET 500 twice", async () => {
        vi.useFakeTimers();
        const spy = mockFetch(async () => {
            if (spy.mock.calls.length < 3) return new Response("retry", { status: 500 });
            return new Response("ok");
        });
        const query = new Query();

        const promise = query("https://example.com/retry");
        await vi.advanceTimersByTimeAsync(900);
        const response = await promise;

        expect(await response.text()).toBe("ok");
        expect(spy).toHaveBeenCalledTimes(3);
    });

    test("Uses custom retry decisions", async () => {
        const attempts: Array<{ no: number; status: number | undefined }> = [];
        mockFetch(async () => {
            if (attempts.length === 0) return new Response("retry", { status: 500 });
            return new Response("ok");
        });
        const query = new Query({
            retry: (prev) => {
                attempts.push({
                    no: prev.no,
                    status: prev.output instanceof Response ? prev.output.status : undefined,
                });
                return prev.no === 1 ? { should: true, delay: 1 } : { should: false };
            },
        });

        const response = await query("https://example.com/custom-retry");

        expect(await response.text()).toBe("ok");
        expect(attempts).toEqual([
            { no: 1, status: 500 },
            { no: 2, status: 200 },
        ]);
    });

    test("Cancels failed response bodies", async () => {
        vi.useFakeTimers();
        let didCancel = false;
        mockFetch(async () => {
            if (!didCancel) {
                return new Response(
                    createTextStream("retry", { onCancel: () => (didCancel = true), stayOpen: true }),
                    { status: 500 },
                );
            }
            return new Response("ok");
        });
        const query = new Query();

        const promise = query("https://example.com/cancel");
        await vi.advanceTimersByTimeAsync(300);
        const response = await promise;

        expect(await response.text()).toBe("ok");
        expect(didCancel).toBe(true);
    });
});

describe("Timeout and abort", () => {
    const pendingFetch: typeof fetch = (input) => {
        const request = input instanceof Request ? input : new Request(input);

        return new Promise<Response>((_resolve, reject) => {
            if (request.signal.aborted) {
                reject(request.signal.reason);
                return;
            }
            request.signal.addEventListener("abort", () => reject(request.signal.reason), { once: true });
        });
    };

    test("Throws timeout errors", async () => {
        vi.useFakeTimers();
        mockFetch(pendingFetch);
        const query = new Query({ attemptTimeout: 11, retry: () => ({ should: false }) });

        const promise = query("https://example.com/timeout");
        const assertion = expect(promise).rejects.toMatchObject({ cause: { type: "timeout" } });
        await vi.advanceTimersByTimeAsync(11);

        await assertion;
    });

    test("Normalizes user AbortError", async () => {
        const controller = new AbortController();
        mockFetch(pendingFetch);
        const query = new Query();

        const promise = query("https://example.com/abort", { signal: controller.signal });
        await Promise.resolve();
        controller.abort(new DOMException("Abort", "AbortError"));

        await expect(promise).rejects.toMatchObject({ cause: { type: "abortion" } });
    });

    test("Normalizes user TimeoutError", async () => {
        const controller = new AbortController();
        mockFetch(pendingFetch);
        const query = new Query();

        const promise = query("https://example.com/timeout-cause", { signal: controller.signal });
        await Promise.resolve();
        controller.abort(new DOMException("Timeout", "TimeoutError"));

        await expect(promise).rejects.toMatchObject({ cause: { type: "timeout" } });
    });
});

describe("JSON schema", () => {
    test("Returns schema output", async () => {
        mockFetch(async () => new Response(JSON.stringify({ value: "1" })));
        const schema = createSchema<unknown, { value: number }>(() => ({ value: { value: 1 } }));
        const query = new Query();

        const response = await query("https://example.com/schema");

        await expect(response.json(schema)).resolves.toEqual({ value: 1 });
    });

    test("Throws Query.Error on schema failure", async () => {
        mockFetch(async () => new Response(JSON.stringify({ value: "bad" })));
        const schema = createSchema<unknown, { value: number }>(() => ({
            issues: [{ message: "Invalid value" }],
        }));
        const query = new Query();

        const response = await query("https://example.com/schema-error");

        await expect(response.json(schema)).rejects.toMatchObject({ cause: { type: "json" } });
    });
});

describe("Safe mode", () => {
    test("Returns data or error branches", async () => {
        mockFetch(async () => new Response("failed", { status: 500 }));
        const query = new Query({ retry: () => ({ should: false }) });

        const result = await query.safe("https://example.com/failure");

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(Query.Error);
            expect(result.error.cause.type).toBe("http");
        }
    });
});
