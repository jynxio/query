import type { QueryOptions } from "../_options.ts";
import type { QueryResponse } from "../_response.ts";
import type { NormalizedFetch } from "../_types.ts";
import type { QueryRequest } from "../_request.ts";

import { sleep } from "../_misc/schedule.ts";
import { withTimeout } from "./with-timeout.ts";
import { createTimeoutError } from "../_misc/error.ts";

const OVERALL_TIMEOUT_SYM = Symbol("overall timeout");
const ATTEMPT_TIMEOUT_SYM = Symbol("attempt timeout");

function withRetry(fn: NormalizedFetch, options: Required<QueryOptions>): NormalizedFetch {
    const duration = options.overallTimeout;
    const wrapError = () => OVERALL_TIMEOUT_SYM;

    return withTimeout(fnWithRetry, { duration, wrapError });

    async function fnWithRetry(request: QueryRequest): Promise<QueryResponse> {
        const startTime = performance.now();
        const duration = options.attemptTimeout;
        const wrapError = () => ATTEMPT_TIMEOUT_SYM;

        for (let attemptNo = 1; ; attemptNo++) {
            const input = request.clone();

            // Rethrow synchronous errors from `fn` synchronously, since custom FetchLike implementations may throw.
            const promise = withTimeout(fn, { duration, wrapError })(input);
            const output = await promise
                .then<{ ok: true; data: QueryResponse }>((data) => ({ ok: true, data }))
                .catch<{ ok: false; error: unknown }>((error) => ({ ok: false, error }));

            // Whether the attempt was aborted.
            const isAborted = input.signal.aborted;
            const abortReason = input.signal.reason as unknown;

            // Abort caused by the overall timeout.
            const isOverallTimeoutAborted = isAborted && abortReason === OVERALL_TIMEOUT_SYM;
            if (isOverallTimeoutAborted) throw createTimeoutError();

            // Abort initiated by the user.
            const isUserManuallyAbort = isAborted && abortReason !== ATTEMPT_TIMEOUT_SYM;
            if (isUserManuallyAbort) throw abortReason;

            // Stop if `options.retry` disables retries.
            const delay = options.shouldRetry({ no: attemptNo, input, output });
            if (delay === false)
                if (output.ok) return output.data;
                else throw output.error;

            // Ensure sufficient time remains for a retry.
            const isTimeEnough = performance.now() - startTime + delay < options.overallTimeout;
            if (!isTimeEnough) throw createTimeoutError();

            // Release the response body before retrying.
            if (output.ok) output.data.body?.cancel().catch(() => {});
            await sleep(delay, request.signal);
        }
    }
}

export { withRetry };
