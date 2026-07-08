import type { QueryOpts } from "./_opts.ts";
import type { QueryError } from "./_error.ts";
import type { FetchArgs, Safe, SchematicRes } from "./_types.ts";

import { withRetry } from "./_hooks/with-retry.ts";
import { withHTTP } from "./_hooks/with-http.ts";
import { withError } from "./_hooks/with-error.ts";
import { withSafe } from "./_hooks/with-safe.ts";
import { QueryRequest } from "./_request.ts";
import { QueryResponse } from "./_response.ts";

function createRoot(
    opts: QueryOpts,
    fn: (...i: FetchArgs) => Promise<Response>,
): (...i: FetchArgs) => Promise<SchematicRes> {
    return withError(withHTTP(withRetry(withError(queryFetch), opts)));

    async function queryFetch(request: QueryRequest): Promise<QueryResponse> {
        const rawResponse = await fn(request);
        const queryResponse = Object.setPrototypeOf(rawResponse, QueryResponse.prototype); //// 这一步不行

        return queryResponse as QueryResponse;
    }
}

function createSafe(
    opts: QueryOpts,
    fn: (...i: FetchArgs) => Promise<Response>,
): (...i: FetchArgs) => Promise<Safe<SchematicRes, QueryError>> {
    return withSafe(createRoot(opts, fn));
}

export { createRoot, createSafe };
