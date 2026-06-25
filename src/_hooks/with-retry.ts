import type { FetchArgs, Fetch } from "../_dprecated-misc/types.ts";
import type { RetryStrategy } from "../_strategy.ts";

import { wait } from "../_dprecated-misc/wait.ts";
import { isResponse } from "../_utils/is-response.ts";
import { isAbortedError, isError, isTimeoutError } from "../_utils/is-error.ts";
import { withCatch } from "../_utils/with-catch.ts";
import { QueryError } from "../_query-error.ts";
import { scheduleTask } from "../_utils/schedule-task.ts";

function withRetry(fetcher: Fetch = fetch, strategy: RetryStrategy): Fetch {
    const retryStatusSet = new Set(strategy.status);
    const retryMethodSet = new Set(strategy.methods.map((item) => item.toUpperCase()));

    return async function (...args: FetchArgs): Promise<Response> {
        const timeoutHandle = new AbortController();
        const triggerTimeout = () => timeoutHandle.abort();
        const cancelTimeout = scheduleTask(triggerTimeout, strategy.totalTimeout);

        const userRequest = new Request(...args);
        const compositedSignal = AbortSignal.any([userRequest.signal, timeoutHandle.signal]);
        const compositedRequest = new Request(userRequest, { signal: compositedSignal });

        compositedSignal.addEventListener("abort", cancelTimeout, { once: true });

        for (const iterator = createIterator(fetcher, compositedRequest); ; ) {
            const chunk = await iterator.next();

            if (compositedSignal.aborted) throw new QueryError({ type: "abortion" });
            if (!chunk.done) continue;

            cancelTimeout();
            compositedSignal.removeEventListener("abort", cancelTimeout);

            return chunk.value;
        }
    };

    async function* createIterator(fetcher: Fetch, request: Request): AsyncGenerator<void, Response, void> {
        let attempt = 0;
        let clonedRequest = request.clone();

        const safeFetch = withCatch(fetcher, (error) => error);

        for (;;) {
            const result = await safeFetch(clonedRequest);
            yield;

            // Resolved
            if (isResponse(result)) {
                const isRetryStatus = retryStatusSet.has(result.status);
                if (!isRetryStatus) return result;

                const isRetryMethod = retryMethodSet.has(clonedRequest.method);
                if (!isRetryMethod) return result;

                const hasExceededRetryCount = attempt >= strategy.retryCount;
                if (hasExceededRetryCount) return result;

                result.body?.cancel().catch(() => undefined); // Revoke stream before retry
            }

            // Rejected
            if (isError(result)) {
                if (isAbortedError(result)) throw result;
                if (isTimeoutError(result)) throw result;

                const isRetryMethod = retryMethodSet.has(clonedRequest.method);
                if (!isRetryMethod) throw result;

                const hasExceededRetryCount = attempt >= strategy.retryCount;
                if (hasExceededRetryCount) throw result;
            }

            // Both
            await wait(getDelay(attempt + 1, result, strategy), clonedRequest.signal); //// 这个 signal？？？？
            yield;

            attempt++;
            clonedRequest = request.clone();
        }
    }
}

////////////////////////
function getDelay(
    attempt: number,
    resOrErr: Response | Error,
    { jitter, getRetryDelay, backoffLimit }: Required<RetryStrategy>,
): number {
    const serverSideDelay = getServerSideDelay(resOrErr);

    /**
     * 严格遵守 Server 所提供的 Retry After，哪怕会超出 Runtime 的 Delay 极限，这会有异常，但归咎于 Server 的不合理设计
     */
    if (serverSideDelay !== undefined) return serverSideDelay;

    const coefficient = jitter ? Math.random() : 1;
    const clientSideDelay = Math.min(getRetryDelay(attempt), backoffLimit);

    return coefficient * clientSideDelay;

    function getServerSideDelay(res: unknown): undefined | number {
        if (!isResponse(res)) return;

        const value = res?.headers.get("retry-after");
        if (!value) return;

        const seconds = Number(value);
        if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

        const date = Date.parse(value);
        if (Number.isFinite(date)) return Math.max(0, date - Date.now());

        return;
    }
}

function getDelayFromStrategy() {}

function getDelayFromResponse(res: Response): undefined | number {
    const value = res.headers.get("retry-after");
    if (!value) return;

    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());

    return;
}

export { withRetry };
