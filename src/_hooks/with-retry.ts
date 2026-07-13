import type { QueryOptions } from "../_options.ts";
import type { QueryResponse } from "../_response.ts";
import type { NormalizedFetch } from "../_types.ts";
import type { QueryRequest } from "../_request.ts";

import { isResponse } from "../_misc/guards.ts";
import { QueryError } from "../_error.ts";
import { sleep } from "../_misc/sleep.ts";
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

            // 如果 fn 抛出同步异常，那么就同步 throw（用户自定义的 FetchLike 可能会抛出同步异常）
            const promise = withTimeout(fn, { duration, wrapError })(input);
            const output = await promise
                .then<{ ok: true; data: QueryResponse }>((data) => ({ ok: true, data }))
                .catch<{ ok: false; error: unknown }>((error) => ({ ok: false, error }));

            // 如果 fn 被终止
            const isAborted = input.signal.aborted;
            const abortReason = input.signal.reason as unknown;

            // 如果 fn 被终止 && 超总时长
            const isOverallTimeoutAborted = isAborted && abortReason === OVERALL_TIMEOUT_ERROR;
            if (isOverallTimeoutAborted) throw abortReason;

            // 如果 fn 被终止 & 用户终止
            const isUserManuallyAbort = isAborted && abortReason !== ATTEMPT_TIMEOUT_ERROR;
            if (isUserManuallyAbort) throw abortReason;

            // 如果 options.retry 决定不重试
            const retry = options.retry({ no: attemptNo, input, output });
            if (!retry.should)
                if (output.ok) return output.data;
                else throw output.error;

            // 如果不够时间做重试
            const isTimeEnough = performance.now() - startTime + retry.delay < options.overallTimeout;
            if (!isTimeEnough) throw new QueryError("timeout");

            // 准备重试，开始前要释放 body
            if (isResponse(output)) output.body?.cancel().catch(() => {});
            await sleep(retry.delay, request.signal);
        }
    }
}

export { withRetry };
