import type { FetchArgs, Fetch } from "../_types.ts";
import type { Config } from "../_config.ts";

import { isResponse } from "../_utils/is-response.ts";
import { isAbortedError, isError, isTimeoutError } from "../_utils/is-error.ts";
import { withCatch } from "../_utils/with-catch.ts";
import { QueryError } from "../_query-error.ts";
import { scheduleTask } from "../_utils/schedule-task.ts";
import { sleep } from "../_utils/sleep.ts";

function withRetry(fetcher: Fetch, config: Required<Config>): Fetch {
    return async function (...args: FetchArgs): Promise<Response> {
        const timeout = new AbortController();
        const cancelTimeout = scheduleTask(() => timeout.abort(), config.overallTimeout);

        const userRequest = new Request(...args);
        const userSignal = userRequest.signal;

        const compositedSignal = AbortSignal.any([userSignal, timeout.signal]);
        const compositedRequest = new Request(userRequest, { signal: compositedSignal });

        compositedSignal.addEventListener("abort", cancelFetch, { once: true });

        for (const iterator = createIterator({ fetcher, config, request: compositedRequest }); ; ) {
            const chunk = await iterator.next();

            if (compositedSignal.aborted) throw new QueryError({ type: "abortion" });
            if (!chunk.done) continue;

            cancelTimeout();
            compositedSignal.removeEventListener("abort", cancelTimeout);

            return chunk.value;
        }

        function cancelFetch() {
            cancelTimeout();
            timeout.abort();
            compositedSignal.removeEventListener("abort", cancelFetch);
        }
    };
}

async function* createIterator(props: {
    fetcher: Fetch;
    request: Request;
    config: Required<Config>;
}): AsyncGenerator<void, Response, void> {
    let attemptCount = 0;
    let lastAttemptInput = props.request.clone();

    const safeFetch = withCatch(props.fetcher, (error) => error);

    for (;;) {
        const lastAttemptOutput = await safeFetch(lastAttemptInput);
        yield;

        if (isAbortedError(lastAttemptOutput)) throw lastAttemptOutput;
        if (isTimeoutError(lastAttemptOutput)) throw lastAttemptOutput;

        const [should, delay] = props.config.retry({ attemptCount, lastAttemptInput, lastAttemptOutput });

        if (!should) return throwIfError(lastAttemptOutput);

        // TODO: 这个是否是多余的？因为 strategy 不消费 response.body。
        if (isResponse(lastAttemptInput)) lastAttemptInput.body?.cancel().catch(() => {}); // Revoke stream before retry
        await sleep(delay, lastAttemptInput.signal);
        yield;

        attemptCount++;
        lastAttemptInput = props.request.clone();
    }
}

function throwIfError(i: Response | Error): Response {
    if (isError(i)) throw i;

    return i;
}

export { withRetry };
