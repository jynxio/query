import type { QueryError } from "../_error.ts";
import type { Safe } from "../_types.ts";

import { toQueryError } from "../_misc/transformers.ts";

function withSafe<Args extends unknown[], Res>(
    fn: (...args: Args) => Promise<Res>,
): (...args: Args) => Promise<Safe<Res, QueryError>> {
    return async function (...args: Args): Promise<Safe<Res, QueryError>> {
        try {
            return { ok: true, data: await fn(...args) };
        } catch (unknown) {
            return { ok: false, error: toQueryError(unknown) };
        }
    };
}

export { withSafe };
