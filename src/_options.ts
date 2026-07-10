import type { QueryResponse } from "./_response.ts";
import type { QueryError } from "./_error.ts";

import { isError } from "./_misc/guards.ts";

type Options = {
    /**
     * Max time for one try.
     *
     * @defaultValue 10_000
     */
    readonly attemptTimeout: number;
    /**
     * Max time for the whole call.
     *
     * @defaultValue Number.POSITIVE_INFINITY
     */
    readonly overallTimeout: number;
    /**
     * Decides the next try.
     *
     * @defaultValue Retry twice for safe methods and selected status codes.
     */
    readonly retry: (prevAttempt: {
        /**
         * Try number. Starts at 1.
         */
        readonly no: number;
        /**
         * Previous input.
         */
        readonly input: Request;
        /**
         * Previous output.
         */
        readonly output: QueryResponse | QueryError;
    }) => Readonly<{ should: false } | { should: true; delay: number }>;
};

const RETRY_COUNT = 2;
const RETRY_STATUS = new Set([408, 413, 429, 500, 502, 503, 504]);
const RETRY_METHOD = new Set(["get", "put", "head", "delete", "options", "trace"]);
const OPTIONS = { retry, attemptTimeout: 10_000, overallTimeout: Number.POSITIVE_INFINITY } satisfies Options;

/**
 * Default retry.
 *
 * @remarks
 * Retries twice for GET, PUT, HEAD, DELETE, OPTIONS, and TRACE.
 * Retries 408, 413, 429, 500, 502, 503, and 504.
 * Uses Retry-After first. Falls back to 300 ms, then 600 ms.
 */
function retry(prevAttempt: {
    readonly no: number;
    readonly input: Request;
    readonly output: Error | QueryResponse;
}): Readonly<{ should: false } | { should: true; delay: number }> {
    const attemptCountSoFar = prevAttempt.no;
    if (attemptCountSoFar > RETRY_COUNT) return { should: false };

    const isMetMethod = RETRY_METHOD.has(prevAttempt.input.method.toLowerCase());
    if (!isMetMethod) return { should: false };

    const localDelay = 300 * 2 ** (attemptCountSoFar - 1);
    if (isError(prevAttempt.output)) return { should: true, delay: localDelay };

    const isMetStatus = RETRY_STATUS.has(prevAttempt.output.status);
    if (!isMetStatus) return { should: false };

    const remoteDelay = parseRetryAfterField(prevAttempt.output);
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
