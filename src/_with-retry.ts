import type { FetchArgs, Fetch } from "./_misc/types.ts";
import type { RetryStrategy } from "./_strategy.ts";

import { wait } from "./_misc/wait.ts";
import { withTry } from "./_misc/with-try.ts";
import { toFunction } from "./_misc/to-function.ts";
import { isResponse } from "./_misc/is-response.ts";
import { isError } from "./_misc/is-error.ts";
import { toError } from "./_misc/to-error.ts";
import { createTimeoutSignal } from "./_misc/create-timeout-signal.ts";

const ABORT_ERROR_NAME = "AbortError";
const TIMEOUT_ERROR_NAME = "TimeoutError";

function withRetry(fetcher: Fetch = fetch, strategy: RetryStrategy): Fetch {
    const tryFetcher = withTry(fetcher);
    const statusSet = new Set(strategy.status);
    const methodSet = new Set(strategy.methods.map((item) => item.toUpperCase()));

    return function (...args: FetchArgs): Promise<Response> {
        let isSettled = false;
        const { promise, resolve, reject } = Promise.withResolvers<Response>();

        const originalReq = new Request(...args);
        const originalSignal = originalReq.signal;

        const [timeoutSignal, cancelTimeoutSignal] = createTimeoutSignal(strategy.totalTimeout);
        const compositedSignal = AbortSignal.any([originalSignal, timeoutSignal]);
        const req = new Request(originalReq, { signal: compositedSignal });

        // TODO(QueryError): Decide whether unexpected exec failures should be QueryError("unknown") before settling.
        void exec(req).then(onSettle).catch(onSettle);
        compositedSignal.addEventListener("abort", onAbort);

        return promise;

        function onAbort() {
            onSettle(req.signal.reason);
        }

        function onSettle(i: unknown): void {
            if (isSettled) return;

            isSettled = true;
            cancelTimeoutSignal();
            req.signal.removeEventListener("abort", onAbort);

            if (isResponse(i)) return resolve(i);
            // TODO(QueryError): AbortError, TimeoutError, network errors, and unknown errors currently escape as raw Error.
            if (isError(i)) return reject(i);

            // TODO(QueryError): Non-Error rejection reasons are converted to plain Error, not QueryError("unknown").
            reject(toError(i));
        }
    };

    async function exec(originalReq: Request): Promise<Response | Error> {
        let attempt = 0;
        let req = originalReq.clone();

        for (;;) {
            const resOrErr = await tryFetcher(req);

            // For Resolved
            if (isResponse(resOrErr)) {
                const isPermittedStatus = statusSet.has(resOrErr.status);
                if (!isPermittedStatus) return resOrErr;
            }

            // For Rejected
            if (isError(resOrErr)) {
                const hasAborted = resOrErr.name === ABORT_ERROR_NAME;
                const hasTimeOuted = resOrErr.name === TIMEOUT_ERROR_NAME;

                if (hasAborted || hasTimeOuted) return resOrErr;
            }

            // For Both
            const isPermittedMethod = methodSet.has(req.method);
            if (!isPermittedMethod) return resOrErr;

            const hasExceededRetryCount = attempt >= strategy.retryCount;
            if (hasExceededRetryCount) return resOrErr;

            revokeReadableStream(resOrErr);
            await wait(getDelay(attempt + 1, resOrErr, strategy), req.signal);

            // TODO(QueryError): Convert aborted retry wait reason to QueryError("abortion") or QueryError("timeout").
            if (req.signal.aborted) return toError(req.signal.reason);

            attempt++;
            req = originalReq.clone();
        }
    }
}

function revokeReadableStream(res: unknown): void {
    if (!isResponse(res)) return;
    if (!res.body) return;

    // TODO(QueryError): This intentionally swallows cancel errors; confirm whether QueryError should ever observe them.
    void res.body.cancel().catch(() => undefined);
}

function getDelay(
    attempt: number,
    resOrErr: Response | Error,
    { jitter, retryDelay, backoffLimit }: Required<RetryStrategy>,
): number {
    const serverSideDelay = getServerSideDelay(resOrErr);

    /**
     * 严格遵守 Server 所提供的 Retry After，哪怕会超出 Runtime 的 Delay 极限，这会有异常，但归咎于 Server 的不合理设计
     */
    if (serverSideDelay !== undefined) return serverSideDelay;

    const coefficient = jitter ? Math.random() : 1;
    const clientSideDelay = Math.min(toFunction(retryDelay)(attempt), backoffLimit);

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

export { withRetry };
