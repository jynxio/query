import type { Safe } from "../_types.ts";

import { QueryPromise } from "../_promise.ts";

function withSafe<Args extends unknown[], R>(
    fn: (...args: Args) => QueryPromise<R>,
): (...args: Args) => QueryPromise<Safe<R, unknown>> {
    return function (...args: Args): QueryPromise<Safe<R, unknown>> {
        return fn(...args)
            .then<{ ok: true; data: R }>((data) => ({ ok: true, data }))
            .catch<{ ok: false; error: unknown }>((error) => ({ ok: false, error }));
    };
}

export { withSafe };
