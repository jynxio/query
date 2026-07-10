import type { GlobalthisFetch, NormalizedFetch } from "../_types.ts";
import type { QueryPromise } from "../_promise.ts";

import { QueryRequest } from "../_request.ts";
import { QueryResponse } from "../_response.ts";

function withInternalize(fn: GlobalthisFetch): NormalizedFetch {
    return normalizeFetch(fn);
}

function withExternalize(
    fn: NormalizedFetch,
): (...args: Parameters<GlobalthisFetch>) => QueryPromise<QueryResponse> {
    return function (...args: Parameters<GlobalthisFetch>): QueryPromise<QueryResponse> {
        return fn(new QueryRequest(...args));
    };
}

function normalizeFetch(fn: GlobalthisFetch): NormalizedFetch {
    return async function (request: QueryRequest) {
        return QueryResponse.cast(await fn(request));
    };
}

export { withInternalize, withExternalize };
