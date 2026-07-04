import { QueryError } from "../_error.ts";
import { isQueryError } from "../_misc/guards.ts";
import { toError } from "../_misc/transformers.ts";

function withError<Args extends unknown[], Res>(
    fn: (...args: Args) => Promise<Res>,
): (...args: Args) => Promise<Res> {
    return async function (...args: Args): Promise<Res> {
        try {
            return await fn(...args);
        } catch (unknown) {
            if (isQueryError(unknown)) throw unknown;

            throw new QueryError("unknown", toError(unknown));
        }
    };
}

export { withError };
