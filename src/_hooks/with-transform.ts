import type { FetchLike, QueryFetch } from "../_types.ts";

import { QueryRequest } from "../_request.ts";
import { QueryResponse } from "../_response.ts";

function withInternalize(fn: FetchLike): QueryFetch {
    return async function (request) {
        const rawResponse = await fn(request);
        const queryResponse = Object.setPrototypeOf(rawResponse, QueryResponse.prototype); //// 这一步不行

        return queryResponse as QueryResponse;
    };
}

function withExternalize(fn: QueryFetch): (...args: Parameters<FetchLike>) => ReturnType<QueryFetch> {
    return function (...args: Parameters<FetchLike>): ReturnType<QueryFetch> {
        return fn(new QueryRequest(...args));
    };
}

export { withInternalize, withExternalize };
