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
     * Returns the delay in milliseconds, or `false` to stop.
     *
     * @defaultValue Retry twice for safe methods and selected status codes.
     */
    readonly shouldRetry: (prevAttempt: {
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
    }) => false | number;

    /**
     * Determines whether to throw.
     *
     * @defaultValue Throw non-ok responses that are not opaque.
     */
    readonly shouldThrow: (response: QueryResponse) => boolean;
};

const RETRY_COUNT = 2;
const RETRY_STATUS = new Set([408, 413, 429, 500, 502, 503, 504]);
const RETRY_METHOD = new Set(["get", "put", "head", "delete", "options", "trace"]);
const OPTIONS = {
    shouldRetry,
    shouldThrow,
    attemptTimeout: 10_000,
    overallTimeout: Number.POSITIVE_INFINITY,
} satisfies Options;

/**
 * Default throw policy.
 *
 * @remarks
 * Throws non-ok responses that are not opaque.
 */
function shouldThrow(response: QueryResponse): boolean {
    if (response.ok) return false;
    if (response.type === "opaque") return false;

    return true;
}

/**
 * Default retry policy.
 *
 * @remarks
 * Retries twice for GET, PUT, HEAD, DELETE, OPTIONS, and TRACE.
 * Retries responses with status 408, 413, 429, 500, 502, 503, or 504.
 * Uses Retry-After first, then falls back to 300 ms and 600 ms.
 */
function shouldRetry(prevAttempt: {
    readonly no: number;
    readonly input: Request;
    readonly output: Safe<QueryResponse, unknown>;
}): false | number {
    const attemptCountSoFar = prevAttempt.no;
    if (attemptCountSoFar > RETRY_COUNT) return false;

    const isRetryableMethod = RETRY_METHOD.has(prevAttempt.input.method.toLowerCase());
    if (!isRetryableMethod) return false;

    const localDelay = 300 * 2 ** (attemptCountSoFar - 1);
    if (!prevAttempt.output.ok) return localDelay;

    const isRetryableStatus = RETRY_STATUS.has(prevAttempt.output.data.status);
    if (!isRetryableStatus) return false;

    const remoteDelay = parseRetryAfterField(prevAttempt.output.data);
    if (remoteDelay === undefined) return localDelay;

    return remoteDelay;

    function parseRetryAfterField(response: Response): number | undefined {
        const field = response.headers.get("Retry-After");
        if (!field) return;

        const seconds = Number(field);
        if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

        const date = Date.parse(field);
        if (Number.isFinite(date)) return Math.max(0, date - Date.now());
    }
}

export { OPTIONS as DEFAULT_QUERY_OPTIONS };
export type { Options as QueryOptions };
