import { describe, expect, test, vi } from "vite-plus/test";

import { Query } from "../src/index.ts";

const NO_RETRY = { retry: () => ({ should: false }) as const };

describe("Fetch-compatible call behavior", () => {
    test("Invalid request input rejects instead of throwing synchronously", async () => {
        const query = new Query(NO_RETRY);

        const promise = query("http://[");
        expect(promise).toBeInstanceOf(Promise);
        await expect(promise).rejects.toBeInstanceOf(TypeError);

        const safePromise = query.safe("http://[");
        expect(safePromise).toBeInstanceOf(Promise);

        const result = await safePromise;
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBeInstanceOf(TypeError);
    });

    test("A synchronous custom fetch failure bypasses retry", async () => {
        const reason = { source: "sync fetch" };
        const retry = vi.fn(() => ({ should: true, delay: 0 }) as const);
        const fetchLike = vi.fn(() => {
            throw reason;
        }) as unknown as typeof fetch;
        const query = new Query({ retry }, fetchLike);

        const promise = query("https://example.com/sync-failure");
        expect(promise).toBeInstanceOf(Promise);

        await expect(promise).rejects.toBe(reason);
        expect(fetchLike).toHaveBeenCalledTimes(1);
        expect(retry).not.toHaveBeenCalled();
    });

    test("Preserves arbitrary asynchronous rejection reasons", async () => {
        const reason = { source: "async fetch" };
        const fetchLike = vi.fn(async () => Promise.reject(reason)) as unknown as typeof fetch;
        const query = new Query(NO_RETRY, fetchLike);

        await expect(query("https://example.com/rejection")).rejects.toBe(reason);

        const result = await query.safe("https://example.com/rejection");
        expect(result).toEqual({ ok: false, error: reason });
    });
});

describe("Safe mode", () => {
    test("Returns successful responses without changing request behavior", async () => {
        const fetchLike = vi.fn(async () => new Response("ok"));
        const query = new Query(NO_RETRY, fetchLike);

        const result = await query.safe("https://example.com/safe-success");

        expect(result.ok).toBe(true);
        if (result.ok) expect(await result.data.text()).toBe("ok");
        expect(fetchLike).toHaveBeenCalledTimes(1);
    });

    test("Preserves the original library error object", async () => {
        const query = new Query(
            NO_RETRY,
            async () => new Response("failure", { status: 500, statusText: "Failure" }),
        );

        let thrown: unknown;
        try {
            await query("https://example.com/http-error");
        } catch (error) {
            thrown = error;
        }

        const result = await query.safe("https://example.com/http-error");

        expect(thrown).toBeInstanceOf(Query.Error);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBeInstanceOf(Query.Error);
            expect((result.error as InstanceType<typeof Query.Error>).cause.type).toBe("http");
        }
    });
});
