import type { NormalizedFetch } from "../_types.ts";

import { QueryError } from "../_error.ts";
import { isAbortedError, isQueryError, isTimeoutError } from "../_misc/guards.ts";
import { toError } from "../_misc/transformers.ts";

function withError(fn: NormalizedFetch): NormalizedFetch {
    return async function (request) {
        try {
            return await fn(request);
        } catch (unknown) {
            if (isQueryError(unknown)) throw unknown;
            if (isTimeoutError(unknown)) throw new QueryError("timeout");
            if (isAbortedError(unknown)) throw new QueryError("abort");

            throw new QueryError("unknown", toError(unknown));
        }
    };
}

export { withError };
