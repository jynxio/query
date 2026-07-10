import type { QueryOptions } from "../_options.ts";
import type { QueryResponse } from "../_response.ts";
import type { NormalizedFetch } from "../_types.ts";
import type { QueryRequest } from "../_request.ts";

import { isResponse } from "../_misc/guards.ts";
import { isAbortedError, isTimeoutError } from "../_misc/guards.ts";
import { QueryError } from "../_error.ts";
import { sleep } from "../_misc/sleep.ts";
import { withSafe } from "./with-safe.ts";
import { withTimeout } from "./with-timeout.ts";

const OVERALL_TIMEOUT_ERROR = new QueryError("timeout");
const ATTEMPT_TIMEOUT_ERROR = new QueryError("timeout");

const toOverallTimeout = () => OVERALL_TIMEOUT_ERROR;
const toAttemptTimeout = () => ATTEMPT_TIMEOUT_ERROR;

function withRetry(fn: NormalizedFetch, options: Required<QueryOptions>): NormalizedFetch {
    const duration = options.overallTimeout;
    const wrapError = toOverallTimeout;

    return withTimeout(fnWithRetry, { duration, wrapError });

    async function fnWithRetry(request: QueryRequest): Promise<QueryResponse> {
        const attempts = createAttempts(request);

        for (;;) {
            const chunk = await attempts.next();
            if (chunk.done) return chunk.value;
        }
    }

    async function* createAttempts(request: QueryRequest): AsyncGenerator<void, QueryResponse, void> {
        const startTime = performance.now();
        const duration = options.attemptTimeout;
        const wrapError = toAttemptTimeout;

        for (let attemptNo = 1; ; attemptNo++) {
            const input = request.clone();
            const either = await withSafe(withTimeout(fn, { duration, wrapError }))(input);
            const output = either.ok ? either.data : either.error;

            yield;

            if (isAbortedError(output)) throw output;

            const isAttemptTimeout = isTimeoutError(output) && output === ATTEMPT_TIMEOUT_ERROR;
            if (isAttemptTimeout) throw output;

            const prevAttempt = { no: attemptNo, input, output };
            const retry = options.retry(prevAttempt);

            if (!retry.should) return unwrapError(output);
            if (isResponse(output)) output.body?.cancel().catch(() => {}); // Cancel body before retry.

            const elapsedTime = performance.now() - startTime;
            const canRetry = elapsedTime + retry.delay < options.overallTimeout;

            if (!canRetry) throw new QueryError("timeout");

            await sleep(retry.delay, input.signal);
            yield;
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
