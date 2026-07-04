import type { FetchArgs } from "../_types.ts";

import { scheduleTask } from "../_misc/schedule-task.ts";
import { QueryError } from "../_error.ts";

function withTimeout<Res>(
    fn: (...args: FetchArgs) => Promise<Res>,
    opts: { duration: number; wrapError?: (i: QueryError<"timeout">) => Error },
): (...args: FetchArgs) => Promise<Res> {
    let cleanup = () => {};

    return (...args: FetchArgs) => fnWithTimeout(...args).finally(cleanup);

    async function fnWithTimeout(...args: FetchArgs): Promise<Res> {
        const userRequest = new Request(...args);
        const userSignal = userRequest.signal;
        const timeout = scheduleTimeout();

        const compositedSignal = AbortSignal.any([userSignal, timeout.signal]);
        const compositedRequest = new Request(userRequest, { signal: compositedSignal });

        cleanup = timeout.cancel;
        return fn(compositedRequest);
    }

    function scheduleTimeout(): { cancel: () => void; signal: AbortSignal } {
        const handle = new AbortController();
        const should = opts.duration !== Number.POSITIVE_INFINITY;

        if (!should) return { signal: handle.signal, cancel: () => {} };

        const wrapError = opts.wrapError ?? ((i) => i);
        const trigger = () => handle.abort(wrapError(new QueryError("timeout")));
        const cancel = scheduleTask(trigger, opts.duration);

        return { cancel, signal: handle.signal };
    }
}

export { withTimeout };
