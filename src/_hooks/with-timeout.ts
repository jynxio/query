import type { QueryResponse } from "../_response.ts";
import type { QueryRequest } from "../_request.ts";
import type { QueryPromise } from "../_promise.ts";
import type { NormalizedFetch } from "../_types.ts";

import { schedule } from "../_misc/schedule.ts";
import { QueryError } from "../_error.ts";
import { withAbort } from "./with-abort.ts";

function withTimeout(
    fn: NormalizedFetch,
    options: { duration: number; wrapError?: (i: QueryError<"timeout">) => Error },
): NormalizedFetch {
    const hasNoTimeout = options.duration === Number.POSITIVE_INFINITY;
    if (hasNoTimeout) return fn;

    return function (request: QueryRequest): QueryPromise<QueryResponse> {
        const result = withAbort(fn)(request);
        const cleanupTask = schedule(() => {
            const wrapError = options.wrapError ?? ((i) => i);
            const error = wrapError(new QueryError("timeout"));

            /**
             * In some cases, request.abort may intentionally have no effect. result.abort is the fallback for such
             * cases, ensuring that query has terminated from the user's perspective even though the underlying fetch
             * has not.
             */
            result.abort(error);
            request.abort(error);
        }, options.duration);

        return result.promise.finally(cleanupTask);
    };
}

export { withTimeout };
