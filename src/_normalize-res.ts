// TODO(QueryError): Replace deprecated YakError with QueryError for HTTP errors if this hook remains active.
import { withDeadline, withFallback } from "./_misc/_with-timeout.ts";
import { safe } from "./_misc/safe.ts";
import { timeOut } from "./_misc/time-out.ts";
import { QueryError } from "./_query-error.ts";

const DEADLINE = 10_000;
const MAX_BYTES = 1024 * 1024;

function normalizeResponse(res: Response): Response {
    if (res.ok) return res;
    if (res.type === "opaque") return res;

    let cachedStatusError: undefined | Promise<unknown> = undefined;

    const clonedRes = res.clone();
    const cause = {
        response: res,
        statusCode: res.status,
        statusText: res.statusText,
        // TODO: 加 Schema
        statusError: async () => {
            if (!clonedRes) return;

            return (cachedStatusError ??= readResponse(clonedRes));
        },
    };

    throw new QueryError({ type: "http", details: cause });
}

async function readResponse(res: Response): Promise<unknown> {
    const text = await readResponseAsText(res);
    if (text === undefined) return;

    const contentType = res.headers.get("content-type") ?? "";
    const mimeType = (contentType.split(";", 1)[0] ?? "").trim().toLowerCase();

    const isJSON = /\/(?:.*[.+-])?json$/.test(mimeType);
    if (!isJSON) return text;

    // TODO(QueryError): JSON parse errors in statusError are swallowed; decide whether this stays undefined or becomes QueryError("unknown").
    return safe(() => JSON.parse(text) as unknown);
}

async function readResponseAsText(res: Response): Promise<string | undefined> {
    const body = res.body;

    if (!body) return await withFallback(withDeadline(() => res.text(), DEADLINE))();

    // TODO(QueryError): getReader failures are swallowed; confirm desired QueryError behavior.
    const reader = safe(() => body.getReader());
    if (!reader) return;

    // TODO(QueryError): read/timeOut failures are swallowed; confirm desired QueryError behavior.
    const result = await safe(() => timeOut(readStream(reader, MAX_BYTES), DEADLINE));
    // TODO(QueryError): reader.cancel failures are swallowed; confirm desired QueryError behavior.
    return (reader.cancel().catch(() => undefined), result);

    async function readStream(reader: ReadableStreamDefaultReader<Uint8Array>, maxBytes: number) {
        const chunks: string[] = [];
        const decoder = new TextDecoder();

        for (let bytes = 0; ; ) {
            const { done, value } = await reader.read();
            if (done) return chunks.concat(decoder.decode()).join("");

            bytes += value.byteLength;
            // TODO(QueryError): Oversized error bodies silently cancel and return undefined; confirm desired QueryError behavior.
            if (bytes > maxBytes) return void reader.cancel().catch(() => undefined);

            chunks.push(decoder.decode(value, { stream: true }));
        }
    }
}

export { normalizeResponse };
