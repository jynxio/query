import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { SchemaError } from "@standard-schema/utils";

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

async function captureThrownResponse(promise: unknown): Promise<Response> {
    try {
        await promise;
    } catch (error) {
        expect(error).toBeInstanceOf(Response);
        return error as Response;
    }

    throw new Error("Expected a non-ok Response to be thrown");
}

describe("Public API", () => {
    test("Constructs a callable query with safe mode", () => {
        const query = new Query();

        expect(query).toBeTypeOf("function");
        expect(query.safe).toBeTypeOf("function");
        expect(Query.Request).toBeTypeOf("function");
        expect(Query.Response).toBeTypeOf("function");
        expect(Query.Promise).toBeTypeOf("function");
    });
});

describe("Non-2xx errors", () => {
    test("Throw the response with a readable JSON body", async () => {
        mockFetch(async () => {
            return new Response(JSON.stringify({ code: "missing" }), {
                headers: { "content-type": "application/json" },
                status: 404,
                statusText: "Not Found",
            });
        });
        const query = new Query({ shouldRetry: () => false });

        const response = await captureThrownResponse(query("https://example.com/missing"));

        expect(response.status).toBe(404);
        expect(response.statusText).toBe("Not Found");
        await expect(response.json()).resolves.toEqual({ code: "missing" });
    });

    test("Read text error bodies", async () => {
        mockFetch(async () => {
            return new Response("plain failure", {
                headers: { "content-type": "text/plain" },
                status: 500,
            });
        });
        const query = new Query({ shouldRetry: () => false });

        const response = await captureThrownResponse(query("https://example.com/failure"));

        await expect(response.text()).resolves.toBe("plain failure");
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
            shouldRetry: (prev) => {
                attempts.push({
                    no: prev.no,
                    status: prev.output.ok ? prev.output.data.status : undefined,
                });
                return prev.no === 1 ? 1 : false;
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
        const query = new Query({ attemptTimeout: 11, shouldRetry: () => false });

        const promise = query("https://example.com/timeout");
        const assertion = expect(promise).rejects.toMatchObject({ name: "TimeoutError" });
        await vi.advanceTimersByTimeAsync(11);

        await assertion;
    });

    test("Preserves user AbortError", async () => {
        const controller = new AbortController();
        mockFetch(pendingFetch);
        const query = new Query();
        const reason = new DOMException("Abort", "AbortError");

        const promise = query("https://example.com/abort", { signal: controller.signal });
        await Promise.resolve();
        controller.abort(reason);

        await expect(promise).rejects.toBe(reason);
    });

    test("Preserves user TimeoutError", async () => {
        const controller = new AbortController();
        mockFetch(pendingFetch);
        const query = new Query();
        const reason = new DOMException("Timeout", "TimeoutError");

        const promise = query("https://example.com/timeout-cause", { signal: controller.signal });
        await Promise.resolve();
        controller.abort(reason);

        await expect(promise).rejects.toBe(reason);
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

    test("Throws SchemaError on schema failure", async () => {
        mockFetch(async () => new Response(JSON.stringify({ value: "bad" })));
        const schema = createSchema<unknown, { value: number }>(() => ({
            issues: [{ message: "Invalid value" }],
        }));
        const query = new Query();

        const response = await query("https://example.com/schema-error");

        await expect(response.json(schema)).rejects.toBeInstanceOf(SchemaError);
    });
});

describe("Safe mode", () => {
    test("Returns data or error branches", async () => {
        mockFetch(async () => new Response("failed", { status: 500 }));
        const query = new Query({ shouldRetry: () => false });

        const result = await query.safe("https://example.com/failure");

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(Response);
            expect((result.error as Response).status).toBe(500);
        }
    });
});
