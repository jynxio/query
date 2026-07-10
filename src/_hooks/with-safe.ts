import type { QueryError } from "../_error.ts";
import type { Safe } from "../_types.ts";
import { QueryPromise } from "../_promise.ts";

import { toQueryError } from "../_misc/transformers.ts";

function withSafe<Args extends unknown[], R>(
    fn: (...args: Args) => QueryPromise<R>,
): (...args: Args) => QueryPromise<Safe<R, QueryError>> {
    return function (...args: Args): QueryPromise<Safe<R, QueryError>> {
        try {
            return fn(...args)
                .then((res) => ({ ok: true, data: res }) as const)
                .catch((err) => ({ ok: false, error: toQueryError(err) }) as const);
        } catch (unknown) {
            return QueryPromise.resolve({ ok: false, error: toQueryError(unknown) });
        }
    };
}

export { withSafe };
