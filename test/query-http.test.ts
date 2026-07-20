import { describe, expect, test, vi } from "vite-plus/test";

import { Query } from "../src/index.ts";

const NO_RETRY = { shouldRetry: () => false as const };

async function getThrownResponse(response: Response): Promise<Response> {
    const query = new Query(NO_RETRY, async () => response);

    try {
        await query("https://example.com/http-error");
    } catch (error) {
        expect(error).toBeInstanceOf(Response);
        return error as Response;
    }

    throw new Error("Expected a non-ok Response to be thrown");
}

describe("Non-ok responses throw the response", () => {
    test("Exposes status and statusText on the thrown response", async () => {
        const response = await getThrownResponse(
            new Response("missing", { status: 404, statusText: "Not Found" }),
        );

        expect(response.status).toBe(404);
        expect(response.statusText).toBe("Not Found");
        expect(response.ok).toBe(false);
    });

    test("The thrown response body can be read as JSON", async () => {
        const response = await getThrownResponse(
            new Response('{"code":"json"}', {
                status: 400,
                headers: { "content-type": "application/json" },
            }),
        );

        await expect(response.json()).resolves.toEqual({ code: "json" });
    });

    test("The thrown response body can be read as text", async () => {
        const response = await getThrownResponse(
            new Response("plain failure", {
                status: 500,
                headers: { "content-type": "text/plain" },
            }),
        );

        await expect(response.text()).resolves.toBe("plain failure");
    });

    test("A null body reads as an empty string", async () => {
        const response = await getThrownResponse(new Response(null, { status: 500 }));

        await expect(response.text()).resolves.toBe("");
    });
});

describe("shouldThrow policy", () => {
    test("Ok responses are returned, not thrown", async () => {
        const query = new Query(NO_RETRY, async () => new Response("ok", { status: 200 }));

        const response = await query("https://example.com/ok");

        expect(response.ok).toBe(true);
        expect(await response.text()).toBe("ok");
    });

    test("A custom shouldThrow can suppress throwing on non-ok responses", async () => {
        const shouldThrow = vi.fn(() => false);
        const query = new Query(
            { shouldRetry: () => false, shouldThrow },
            async () => new Response("still returned", { status: 503 }),
        );

        const response = await query("https://example.com/suppressed");

        expect(response.status).toBe(503);
        expect(await response.text()).toBe("still returned");
        expect(shouldThrow).toHaveBeenCalledOnce();
    });

    test("A custom shouldThrow can throw on ok responses", async () => {
        const query = new Query(
            { shouldRetry: () => false, shouldThrow: (response) => response.headers.has("x-fail") },
            async () => new Response("ok", { status: 200, headers: { "x-fail": "1" } }),
        );

        await expect(query("https://example.com/forced")).rejects.toBeInstanceOf(Response);
    });
});
