import type { QueryOpts } from "./_types.ts";

import { isError } from "./_utils/is-error.ts";

const RETRY_COUNT = 2;
const RETRY_STATUS = new Set([408, 413, 429, 500, 502, 503, 504]);
const RETRY_METHOD = new Set(["get", "put", "head", "delete", "options", "trace"]);
const DEFAULT_OPTS = {
    retry,
    attemptTimeout: 10_000,
    overallTimeout: Number.POSITIVE_INFINITY,
} as const satisfies QueryOpts;

/**
 * The default retry strategy.
 *
 * - Count: 2
 * - Status: 408, 413, 429, 500, 502, 503, 504
 * - Method: GET, PUT, HEAD, DELETE, OPTIONS, TRACE
 * - Delay: `Retry-After` first, otherwise `300 * 2 ** retryCount` (no backoff limit or jitter)
 *
 * // TODO: 更新注释
 * @param props - The retry strategy input.
 * @param props.attemptCount - 已经尝试过的次数
 * @param props.lastAttemptInput - The input (request) from the previous attempt.
 * @param props.lastAttemptOutput - The output (response or error) from the previous attempt.
 * @returns `[false]` to stop, or `[true, delay]` to retry after `delay` ms.
 */
// TODO: 补充，用户是看不到 abortion、timeout 等 queryerror 的，因为我特意在 withRetry 里不把这些给用户
function retry(props: {
    readonly attemptCount: number;
    readonly lastAttemptInput: Request;
    readonly lastAttemptOutput: Response | Error;
}): Readonly<[should: false] | [should: true, delay: number]> {
    const retryCount = props.attemptCount - 1;
    if (retryCount >= RETRY_COUNT) return [false];

    const isMetMethod = RETRY_METHOD.has(props.lastAttemptInput.method.toLowerCase());
    if (!isMetMethod) return [false];

    const localDelay = 300 * 2 ** retryCount;
    if (isError(props.lastAttemptOutput)) return [true, localDelay];

    const isMetStatus = RETRY_STATUS.has(props.lastAttemptOutput.status);
    if (!isMetStatus) return [false];

    const remoteDelay = parseRetryAfterField(props.lastAttemptOutput);
    if (remoteDelay === undefined) return [true, localDelay];

    return [true, remoteDelay];

    function parseRetryAfterField(response: Response): number | undefined {
        const field = response.headers.get("Retry-After");
        if (!field) return;

        const seconds = Number(field);
        if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

        const date = Date.parse(field);
        if (Number.isFinite(date)) return Math.max(0, date - Date.now());
    }
}

export { DEFAULT_OPTS };
