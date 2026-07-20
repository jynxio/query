import type { QueryResponse } from "../_response.ts";
import type { QueryRequest } from "../_request.ts";
import type { QueryPromise } from "../_promise.ts";
import type { NormalizedFetch } from "../_types.ts";

import { schedule } from "../_misc/schedule.ts";
import { withAbort } from "./with-abort.ts";
import { createTimeoutError } from "../_misc/error.ts";

function withTimeout(
    fn: NormalizedFetch,
    options: { duration: number; wrapError?: (timeoutError: DOMException) => unknown },
): NormalizedFetch {
    const hasNoTimeout = options.duration === Number.POSITIVE_INFINITY;
    if (hasNoTimeout) return fn;

    return function (request: QueryRequest): QueryPromise<QueryResponse> {
        const handle = withAbort(fn)(request);
        const cleanupTask = schedule(() => {
            const timeoutError = createTimeoutError();
            const abortReason = (options.wrapError ?? ((i) => i))(timeoutError);

            /**
             * request.abort may intentionally do nothing. handle.abort ensures the query ends from the user's
             * perspective even if the underlying fetch continues.
             */
            handle.abort(timeoutError);
            request.abort(abortReason);
        }, options.duration);

        return handle.promise.finally(cleanupTask);
    };
}

export { withTimeout };
