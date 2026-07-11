import type { JSONData } from "../_types.ts";
import type { NormalizedFetch } from "../_types.ts";

import { QueryError } from "../_error.ts";

function withHTTP(fn: NormalizedFetch): NormalizedFetch {
    return async function (request) {
        const response = await fn(request);

        if (response.ok) return response;
        if (response.type === "opaque") return response;

        let stateError: Promise<JSONData>;

        const details = {
            response: response,
            statusCode: response.status,
            statusText: response.statusText,
            statusError: function (signal?: AbortSignal): Promise<JSONData> {
                return (stateError ??= createStateError(response.clone(), signal));
            },
        };

        throw new QueryError("http", details);
    };
}

async function createStateError(response: Response, signal?: AbortSignal): Promise<JSONData> {
    if (signal?.aborted) throw new QueryError("abort");

    let text = "";
    for await (const chunk of createStringifier(response, signal)) text += chunk;

    const contentType = response.headers.get("content-type") ?? "";
    const mimeType = (contentType.split(";", 1)[0] ?? "").trim().toLowerCase();
    const data = /\/(?:.*[.+-])?json$/.test(mimeType) ? (JSON.parse(text) as JSONData) : text;

    return data;
}

async function* createStringifier(
    response: Response,
    signal?: AbortSignal,
): AsyncGenerator<string, void, void> {
    const rawStream = response.body;
    if (!rawStream) return yield await response.text();

    const textStream = rawStream.pipeThrough(new TextDecoderStream(), { signal });
    for await (const chunk of textStream) yield chunk;
}

export { withHTTP };
