import type { QueryPromise } from "../_promise.ts";

function withAbort<Args extends unknown[], R>(
    fn: (...args: Args) => QueryPromise<R>,
): (...args: Args) => { promise: QueryPromise<R>; abort: (reason?: unknown) => void } {
    return function (...args: Args): { promise: QueryPromise<R>; abort: (reason?: unknown) => void } {
        const ctrl = Promise.withResolvers<never>();
        const abort = (reason?: unknown) => ctrl.reject(reason);
        const promise = Promise.race([fn(...args), ctrl.promise]);

        return { abort, promise };
    };
}

export { withAbort };
