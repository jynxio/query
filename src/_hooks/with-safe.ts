import type { QueryError } from "../_error.ts";
import type { Safe } from "../_types.ts";

import { toQueryError } from "../_misc/transformers.ts";

function withSafe<Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<Safe<R, QueryError>> {
    return async function (...args: Args): Promise<Safe<R, QueryError>> {
        try {
            return { ok: true, data: await fn(...args) };
        } catch (unknown) {
            return { ok: false, error: toQueryError(unknown) };
        }
    };
}

export { withSafe };
