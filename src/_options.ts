import type { QueryResponse } from "./_response.ts";

import type { Safe } from "./_types.ts";

type Options = {
    /**
     * Maximum duration of a single attempt.
     *
     * @defaultValue 10_000
     */
    readonly attemptTimeout: number;
    /**
     * Maximum duration of the entire call.
     *
     * @defaultValue Number.POSITIVE_INFINITY
     */
    readonly overallTimeout: number;
    /**
     * Determines whether to retry.
     *
     * @defaultValue Retry twice for safe methods and selected status codes.
     */
    readonly retry: (prevAttempt: {
        /**
         * Attempt number, starting at 1.
         */
        readonly no: number;
        /**
         * Input from the previous attempt.
         */
        readonly input: Request;
        /**
         * Output from the previous attempt.
         */
        readonly output: Safe<QueryResponse, unknown>;
    }) => Readonly<{ should: false } | { should: true; delay: number }>;
};

const RETRY_COUNT = 2;
const RETRY_STATUS = new Set([408, 413, 429, 500, 502, 503, 504]);
const RETRY_METHOD = new Set(["get", "put", "head", "delete", "options", "trace"]);
const OPTIONS = { retry, attemptTimeout: 10_000, overallTimeout: Number.POSITIVE_INFINITY } satisfies Options;

/**
 * Default retry policy.
 *
 * @remarks
 * Retries twice for GET, PUT, HEAD, DELETE, OPTIONS, and TRACE.
 * Retries responses with status 408, 413, 429, 500, 502, 503, or 504.
 * Uses Retry-After first, then falls back to 300 ms and 600 ms.
 */
function retry(prevAttempt: {
    readonly no: number;
    readonly input: Request;
    readonly output: Safe<QueryResponse, unknown>;
}): Readonly<{ should: false } | { should: true; delay: number }> {
    const attemptCountSoFar = prevAttempt.no;
    if (attemptCountSoFar > RETRY_COUNT) return { should: false };

    const isRetryableMethod = RETRY_METHOD.has(prevAttempt.input.method.toLowerCase());
    if (!isRetryableMethod) return { should: false };

    const localDelay = 300 * 2 ** (attemptCountSoFar - 1);
    if (!prevAttempt.output.ok) return { should: true, delay: localDelay };

    const isRetryableStatus = RETRY_STATUS.has(prevAttempt.output.data.status);
    if (!isRetryableStatus) return { should: false };

    const remoteDelay = parseRetryAfterField(prevAttempt.output.data);
    if (remoteDelay === undefined) return { should: true, delay: localDelay };

    return { should: true, delay: remoteDelay };
}

function parseRetryAfterField(response: Response): number | undefined {
    const field = response.headers.get("Retry-After");
    if (!field) return;

    const seconds = Number(field);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

    const date = Date.parse(field);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
}

export { OPTIONS as DEFAULT_QUERY_OPTIONS };
export type { Options as QueryOptions };
