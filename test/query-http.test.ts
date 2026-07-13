import type { QueryErrorCause } from "../src/_error.ts";

import { describe, expect, test } from "vite-plus/test";
import { Query } from "../src/index.ts";

const NO_RETRY = { retry: () => ({ should: false }) as const };

async function getHTTPDetails(response: Response): Promise<QueryErrorCause["http"]> {
    const query = new Query(NO_RETRY, async () => response);

    try {
        await query("https://example.com/http-error");
    } catch (error) {
        expect(error).toBeInstanceOf(Query.Error);
        const queryError = error as InstanceType<typeof Query.Error>;
        expect(queryError.cause.type).toBe("http");
        return queryError.cause.details as QueryErrorCause["http"];
    }

    throw new Error("Expected an HTTP Query.Error");
}

describe("statusError body parsing", () => {
    test("Parses JSON and structured JSON suffix media types", async () => {
        const json = await getHTTPDetails(
            new Response('{"code":"json"}', {
                status: 400,
                headers: { "content-type": "application/json" },
            }),
        );
        const problem = await getHTTPDetails(
            new Response('{"code":"problem"}', {
                status: 400,
                headers: { "content-type": "application/problem+json; charset=utf-8" },
            }),
        );

        await expect(json.statusError()).resolves.toEqual({ code: "json" });
        await expect(problem.statusError()).resolves.toEqual({ code: "problem" });
    });

    test("Returns text and represents a null body as an empty string", async () => {
        const text = await getHTTPDetails(
            new Response("plain failure", {
                status: 500,
                headers: { "content-type": "text/plain" },
            }),
        );
        const empty = await getHTTPDetails(
            new Response(null, {
                status: 500,
                headers: { "content-type": "text/plain" },
            }),
        );

        await expect(text.statusError()).resolves.toBe("plain failure");
        await expect(empty.statusError()).resolves.toBe("");
    });

    test("Shares pending work and memoizes a fulfilled body", async () => {
        const details = await getHTTPDetails(
            new Response('{"code":"cached"}', {
                status: 500,
                headers: { "content-type": "application/json" },
            }),
        );

        const first = details.statusError();
        const concurrent = details.statusError();

        expect(concurrent).toBe(first);
        await expect(first).resolves.toEqual({ code: "cached" });
        await expect(details.statusError()).resolves.toEqual({ code: "cached" });
    });

    test("Does not cache JSON parsing failures", async () => {
        const details = await getHTTPDetails(
            new Response("{invalid", {
                status: 500,
                headers: { "content-type": "application/json" },
            }),
        );

        await expect(details.statusError()).rejects.toBeInstanceOf(SyntaxError);
        await expect(details.statusError()).rejects.toBeInstanceOf(SyntaxError);
    });
});

describe("statusError cancellation", () => {
    test("An already-aborted signal rejects with its original reason and can retry", async () => {
        const details = await getHTTPDetails(
            new Response('{"code":"retry"}', {
                status: 500,
                headers: { "content-type": "application/json" },
            }),
        );
        const reason = { source: "pre-abort" };

        await expect(details.statusError(AbortSignal.abort(reason))).rejects.toBe(reason);
        await expect(details.statusError()).resolves.toEqual({ code: "retry" });
    });

    test("An in-flight abort preserves its reason and a later call can retry", async () => {
        const encoder = new TextEncoder();
        let sourceController: ReadableStreamDefaultController<Uint8Array> | undefined;
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                sourceController = controller;
                controller.enqueue(encoder.encode('{"code":"after-abort"}'));
            },
        });
        const details = await getHTTPDetails(
            new Response(stream, {
                status: 500,
                headers: { "content-type": "application/json" },
            }),
        );
        const controller = new AbortController();
        const reason = { source: "mid-abort" };

        const abortedRead = details.statusError(controller.signal);
        const assertion = expect(abortedRead).rejects.toBe(reason);
        await Promise.resolve();
        controller.abort(reason);
        await assertion;

        const retry = details.statusError();
        sourceController?.close();
        await expect(retry).resolves.toEqual({ code: "after-abort" });
    });

    test("A null body resolves to empty text even if the signal aborts after reading starts", async () => {
        const details = await getHTTPDetails(
            new Response(null, {
                status: 500,
                headers: { "content-type": "text/plain" },
            }),
        );
        const controller = new AbortController();

        const promise = details.statusError(controller.signal);
        controller.abort({ source: "late-null-body-abort" });

        await expect(promise).resolves.toBe("");
    });
});
