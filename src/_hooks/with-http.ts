import type { QueryOptions } from "../_options.ts";
import type { NormalizedFetch } from "../_types.ts";

function withHTTP(fn: NormalizedFetch, options: Required<QueryOptions>): NormalizedFetch {
    return async function (request) {
        const response = await fn(request);
        const should = options.shouldThrow(response);

        if (should) throw response;

        return response;
    };
}

export { withHTTP };
