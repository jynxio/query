import type { FetchArgs, SchematicRes } from "../_types.ts";
import type { QueryOpts } from "../_opts.ts";

import { isResponse } from "../_misc/guards.ts";
import { isAbortedError, isTimeoutError } from "../_misc/guards.ts";
import { QueryError } from "../_error.ts";
import { sleep } from "../_misc/sleep.ts";
import { toRequest } from "../_misc/transformers.ts";
import { withTimeout } from "./with-timeout.ts";
import { withSafe } from "./with-safe.ts";

const OVERALL_TIMEOUT_ERROR = new QueryError("timeout");
const PER_ATTEMPT_TIMEOUT_ERROR = new QueryError("timeout");

const wrapOverallTimeoutError = () => OVERALL_TIMEOUT_ERROR;
const wrapAttemptTimeoutError = () => PER_ATTEMPT_TIMEOUT_ERROR;

function withRetry(
    fn: (...args: FetchArgs) => Promise<SchematicRes>,
    opts: Required<QueryOpts>,
): (...args: FetchArgs) => Promise<SchematicRes> {
    const duration = opts.overallTimeout;
    const fnWithRetry = async (...args: FetchArgs): Promise<SchematicRes> => {
        const request = toRequest(...args);
        const attempt = createAttempter(request);

        for (;;) {
            const chunk = await attempt.next();
            if (chunk.done) return chunk.value;
        }
    };
    const fnWithTimeout = withTimeout(fnWithRetry, { duration, wrapError: wrapOverallTimeoutError });

    return fnWithTimeout;

    async function* createAttempter(request: Request): AsyncGenerator<void, SchematicRes, void> {
        const startTime = performance.now();
        const duration = opts.attemptTimeout;

        const fnWithTimeout = withTimeout(fn, { duration, wrapError: wrapAttemptTimeoutError });
        const fnWithSafe = withSafe(fnWithTimeout);

        for (let attemptNo = 1; ; attemptNo++) {
            const input = request.clone();
            const either = await fnWithSafe(input);
            const output = either.ok ? either.data : either.error;

            yield;

            if (isAbortedError(output)) throw output;
            if (isTimeoutError(output)) {
                const isTriggerByOverall = output === OVERALL_TIMEOUT_ERROR;
                if (isTriggerByOverall) throw output;

                const isTriggerByUser = output !== PER_ATTEMPT_TIMEOUT_ERROR;
                if (isTriggerByUser) throw output;
            }

            const prevAttempt = { no: attemptNo, input: input, output: output };
            const retry = opts.retry(prevAttempt);

            if (!retry.should) return unwrap(output);
            if (isResponse(output)) output.body?.cancel().catch(() => {}); // Cancel body before retry.

            const elapsedTime = performance.now() - startTime;
            const canRetry = elapsedTime + retry.delay < opts.overallTimeout;

            if (!canRetry) throw new QueryError("timeout");

            await sleep(retry.delay, input.signal);
            yield;
        }
    }
}

function unwrap(i: Error): never;
function unwrap<T>(i: T | Error): Exclude<T, Error>;
function unwrap<T>(i: T | Error): Exclude<T, Error> {
    if (i instanceof Error) throw i;

    return i as Exclude<T, Error>;
}

export { withRetry };
