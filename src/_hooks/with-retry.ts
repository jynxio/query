import type { QueryOptions } from "../_options.ts";
import type { QueryResponse } from "../_response.ts";
import type { NormalizedFetch } from "../_types.ts";
import type { QueryRequest } from "../_request.ts";

import { isResponse } from "../_misc/guards.ts";
import { QueryError } from "../_error.ts";
import { sleep } from "../_misc/sleep.ts";
import { withSafe } from "./with-safe.ts";
import { withTimeout } from "./with-timeout.ts";

const OVERALL_TIMEOUT_ERROR = new QueryError("timeout");
const ATTEMPT_TIMEOUT_ERROR = new QueryError("timeout");

function withRetry(fn: NormalizedFetch, options: Required<QueryOptions>): NormalizedFetch {
    const duration = options.overallTimeout;
    const wrapError = () => OVERALL_TIMEOUT_ERROR;

    return withTimeout(fnWithRetry, { duration, wrapError });

    async function fnWithRetry(request: QueryRequest): Promise<QueryResponse> {
        const startTime = performance.now();
        const duration = options.attemptTimeout;
        const wrapError = () => ATTEMPT_TIMEOUT_ERROR;

        for (let attemptNo = 1; ; attemptNo++) {
            const input = request.clone();
            const either = await withSafe(withTimeout(fn, { duration, wrapError }))(input);
            const output = either.ok ? either.data : either.error;

            /**
             * Attempt 规则：
             *   - output 成功：options.retry
             *   - output 异常：
             *     - 同步异常：throw
             *     - 异步异常：
             *       - 请求失败：options.retry
             *       - Abort（来自单次超时）：options.retry
             *       - Abort（来自整体超时）：throw
             *       - 用户 Abort：throw
             */
            const isAttemptTimeout = output === ATTEMPT_TIMEOUT_ERROR;
            if (!isAttemptTimeout) throw output;

            const prevAttempt = { no: attemptNo, input, output };
            const retry = options.retry(prevAttempt);

            if (!retry.should) return unwrapError(output);
            if (isResponse(output)) output.body?.cancel().catch(() => {}); // Cancel body before retry.

            const elapsedTime = performance.now() - startTime;
            const canRetry = elapsedTime + retry.delay < options.overallTimeout;

            if (!canRetry) throw new QueryError("timeout");
            await sleep(retry.delay, input.signal);
        }
    }
}

function unwrapError(i: Error): never;
function unwrapError<T>(i: T | Error): Exclude<T, Error>;
function unwrapError<T>(i: T | Error): Exclude<T, Error> {
    if (i instanceof Error) throw i;

    return i as Exclude<T, Error>;
}

export { withRetry };
