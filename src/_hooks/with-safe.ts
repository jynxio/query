import type { Safe } from "../_types.ts";

import { QueryPromise } from "../_promise.ts";

function withSafe<Args extends unknown[], R>(
    fn: (...args: Args) => QueryPromise<R>,
): (...args: Args) => QueryPromise<Safe<R, Error>> {
    return function (...args: Args): QueryPromise<Safe<R, Error>> {
        try {
            return fn(...args)
                .then((res) => ({ ok: true, data: res }) as const)
                .catch((err) => ({ ok: false, error: toError(err) }) as const);
        } catch (unknown) {
            return QueryPromise.resolve({ ok: false, error: toError(unknown) });
        }
    };
}

function toError(i: unknown): Error {
    return i instanceof Error ? i : new Error(String(i));
}

export { withSafe };
