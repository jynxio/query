import type { GlobalThisFetch, NormalizedFetch } from "../_types.ts";
import type { QueryPromise } from "../_promise.ts";

import { QueryRequest } from "../_request.ts";
import { QueryResponse } from "../_response.ts";

function withInternalize(fn: GlobalThisFetch): NormalizedFetch {
    return normalizeFetch(fn);
}

function withExternalize(
    fn: NormalizedFetch,
): (...args: Parameters<GlobalThisFetch>) => QueryPromise<QueryResponse> {
    /**
     * Convert synchronous exceptions from `new QueryRequest` to Promise rejections to comply with the Fetch Standard.
     */
    return async (...args) => fn(new QueryRequest(...args));
}

function normalizeFetch(fn: GlobalThisFetch): NormalizedFetch {
    /**
     * Do not convert synchronous exceptions from `fn` to Promise rejections, to avoid triggering subsequent retries.
     */
    return (request) => fn(request).then((value) => QueryResponse.cast(value));
}

export { withInternalize, withExternalize };
