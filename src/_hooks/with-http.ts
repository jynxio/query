import type { JSONData, Safe } from "../_types.ts";
import type { NormalizedFetch } from "../_types.ts";

import { QueryError } from "../_error.ts";
import { toJSON } from "../_misc/transformers.ts";

function withHTTP(fn: NormalizedFetch): NormalizedFetch {
    return async function (request) {
        const response = await fn(request);

        if (response.ok) return response;
        if (response.type === "opaque") return response;

        let statusErrorHandle: Safe<JSONData, Error> = { ok: false, error: new QueryError("unknown", "") };

        const clonedResponse = response.clone();
        const details = {
            response: response,
            statusCode: response.status,
            statusText: response.statusText,
            statusError: async (signal?: AbortSignal): Promise<JSONData> => {
                if (signal?.aborted) throw new QueryError("abortion");
                if (statusErrorHandle.ok) return statusErrorHandle.data;

                let text = "";
                for await (const chunk of createStringifier(clonedResponse, signal)) text += chunk;

                const contentType = clonedResponse.headers.get("content-type") ?? "";
                const mimeType = (contentType.split(";", 1)[0] ?? "").trim().toLowerCase();
                const data = /\/(?:.*[.+-])?json$/.test(mimeType) ? toJSON(text) : text;

                return (statusErrorHandle = { ok: true, data }).data;
            },
        };

        throw new QueryError("http", details);
    };
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
