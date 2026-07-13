import type { JSONData } from "../_types.ts";
import type { NormalizedFetch } from "../_types.ts";

import { QueryError } from "../_error.ts";
import { memoize } from "../_misc/memoize.ts";

function withHTTP(fn: NormalizedFetch): NormalizedFetch {
    return async function (request) {
        const response = await fn(request);

        if (response.ok) return response;
        if (response.type === "opaque") return response;

        const originalResponse = response.clone();
        const statusError = memoize((signal?: AbortSignal) => createStatusError(originalResponse, signal));

        throw new QueryError("http", {
            response,
            statusError,
            statusCode: response.status,
            statusText: response.statusText,
        });
    };
}

async function createStatusError(originalResponse: Response, signal?: AbortSignal): Promise<JSONData> {
    if (signal?.aborted) throw signal.reason as unknown;

    const clonedResponse = originalResponse.clone();

    let text = "";
    for await (const chunk of createStringifier()) text += chunk;

    const contentType = clonedResponse.headers.get("content-type") ?? "";
    const mimeType = (contentType.split(";", 1)[0] ?? "").trim().toLowerCase();
    const data = /\/(?:.*[.+-])?json$/.test(mimeType) ? (JSON.parse(text) as JSONData) : text;

    return data;

    async function* createStringifier(): AsyncGenerator<string, void, void> {
        const rawStream = clonedResponse.body;
        if (!rawStream) return yield await clonedResponse.text();

        const textStream = rawStream.pipeThrough(new TextDecoderStream(), { signal });
        for await (const chunk of textStream) yield chunk;
    }
}

export { withHTTP };
