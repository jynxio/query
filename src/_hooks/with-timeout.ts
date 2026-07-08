import type { AbortableFetchLike } from "../_types.ts";

import { scheduleTask } from "../_misc/schedule-task.ts";
import { QueryError } from "../_error.ts";
import { QUERY_REQUEST_ABORT } from "../_consts.ts";

/**
 * @todo
 * 给 QueryFetch 设定时间上限，达到上限后强制杀死，它是否可以结束 Network 里的 fetch，取决于 QueryRequest
 */
function withTimeout(
    fn: AbortableFetchLike,
    opts: { duration: number; wrapError?: (i: QueryError<"timeout">) => Error },
): AbortableFetchLike {
    const hasNoTimeout = opts.duration === Number.POSITIVE_INFINITY;
    if (hasNoTimeout) return fn;

    return async function (request: QueryRequest): Promise<QueryResponse> {
        const handle = Promise.withResolvers<never>();
        const cleanupTask = scheduleTask(timeoutTask, opts.duration);

        return Promise.race([fn(request), handle.promise]).finally(cleanupTask);

        function timeoutTask() {
            const wrapError = opts.wrapError ?? ((i) => i);
            const error = wrapError(new QueryError("timeout"));

            handle.reject(error);
            request[QUERY_REQUEST_ABORT](error);
        }
    };
}

export { withTimeout };
