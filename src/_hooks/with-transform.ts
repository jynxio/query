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
     * Note:
     * Synchronous exceptions thrown by `new QueryRequest` must be converted to
     * Promise rejections to comply with the Fetch Spec.
     */
    return async (...args) => fn(new QueryRequest(...args));
}

function normalizeFetch(fn: GlobalThisFetch): NormalizedFetch {
    return async function (request: QueryRequest) {
        return QueryResponse.cast(await fn(request));
    };
}

export { withInternalize, withExternalize };
