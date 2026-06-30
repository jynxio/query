import { QueryError } from "../_error.ts";
import { withCatch } from "./with-catch.ts";
import { toJSONData } from "./to-json-data.ts";

import type { JSONData } from "./to-json-data.ts";

function normalizeResponse(res: Response): Response {
    if (res.ok) return res;
    if (res.type === "opaque") return res;

    let statusErrorResult: { isReady: false; content?: undefined } | { isReady: true; content: JSONData } = {
        isReady: false,
        content: undefined,
    };

    const clonedRes = res.clone();
    const cause = {
        response: res,
        statusCode: res.status,
        statusText: res.statusText,
        statusError: withCatch(
            async (signal?: AbortSignal): Promise<[true, JSONData] | [false, Error]> => {
                if (signal?.aborted) throw new QueryError({ type: "abortion" });
                if (statusErrorResult.isReady) return [true, statusErrorResult.content];

                let text = "";
                for await (const chunk of createIterator(clonedRes)) {
                    if (signal?.aborted) throw new QueryError({ type: "abortion" });
                    text += chunk;
                }

                const contentType = clonedRes.headers.get("content-type") ?? "";
                const mimeType = (contentType.split(";", 1)[0] ?? "").trim().toLowerCase();
                const content = /\/(?:.*[.+-])?json$/.test(mimeType) ? toJSONData(text) : text;

                statusErrorResult = { isReady: true, content };

                return [true, statusErrorResult.content];
            },
            (error) => error,
        ),
    };

    throw new QueryError({ type: "http", details: cause });
}

async function* createIterator(res: Response): AsyncGenerator<string, void, void> {
    const rawStream = res.body;
    if (!rawStream) return yield await res.text();

    const textStream = rawStream.pipeThrough(new TextDecoderStream());
    for await (const chunk of textStream) yield chunk;
}

export { normalizeResponse };
