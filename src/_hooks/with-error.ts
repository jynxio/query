import { QueryError } from "../_error.ts";
import { isAbortedError, isQueryError, isTimeoutError } from "../_misc/guards.ts";
import { toError } from "../_misc/transformers.ts";

function withError<Args extends unknown[], Res>(
    fn: (...args: Args) => Promise<Res>,
): (...args: Args) => Promise<Res> {
    return async function (...args: Args): Promise<Res> {
        try {
            return await fn(...args);
        } catch (unknown) {
            if (isQueryError(unknown)) throw unknown;
            if (isTimeoutError(unknown)) throw new QueryError("timeout");
            if (isAbortedError(unknown)) throw new QueryError("abortion");

            throw new QueryError("unknown", toError(unknown));
        }
    };
}

export { withError };
