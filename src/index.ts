import type { QueryOptions } from "./_options.ts";
import type { GlobalThisFetch, Safe } from "./_types.ts";

import { DEFAULT_QUERY_OPTIONS } from "./_options.ts";
import { withRetry } from "./_hooks/with-retry.ts";
import { withHTTP } from "./_hooks/with-http.ts";
import { withSafe } from "./_hooks/with-safe.ts";
import { withExternalize, withInternalize } from "./_hooks/with-transform.ts";
import { pipe } from "./_misc/pipe.ts";
import { QueryRequest } from "./_request.ts";
import { QueryResponse } from "./_response.ts";
import { QueryPromise } from "./_promise.ts";

type QueryCall<Result> = {
    /**
     * @deprecated Supported but not recommended.
     */
    (input: Request, init?: Record<PropertyKey, never>): QueryPromise<Result>;
    (input: Parameters<GlobalThisFetch>[0], init?: Parameters<GlobalThisFetch>[1]): QueryPromise<Result>;
};
type Query = BaseQuery & { safe: SafeQuery };
type BaseQuery = QueryCall<QueryResponse>;
type SafeQuery = QueryCall<Safe<QueryResponse, unknown>>;
type QueryConstructor = {
    Promise: typeof QueryPromise;
    Request: typeof QueryRequest;
    Response: typeof QueryResponse;

    new (options?: Partial<QueryOptions>, fn?: GlobalThisFetch): Query;
};

const Query = class {
    static readonly Promise: typeof QueryPromise = QueryPromise;
    static readonly Request: typeof QueryRequest = QueryRequest;
    static readonly Response: typeof QueryResponse = QueryResponse;

    constructor(options?: Partial<QueryOptions>, fn?: GlobalThisFetch) {
        type Cache = { baseQuery?: BaseQuery; safeQuery?: SafeQuery };

        const cache: Cache = {};
        const settledFn = fn ?? globalThis.fetch;
        const settledOptions = {
            attemptTimeout: options?.attemptTimeout ?? DEFAULT_QUERY_OPTIONS.attemptTimeout,
            overallTimeout: options?.overallTimeout ?? DEFAULT_QUERY_OPTIONS.overallTimeout,
            retry: options?.retry ?? DEFAULT_QUERY_OPTIONS.retry,
        } satisfies QueryOptions;

        return Object.assign(baseQuery, { safe: safeQuery });

        function baseQuery(...args: Parameters<GlobalThisFetch>): QueryPromise<QueryResponse> {
            cache.baseQuery ??= pipe(settledFn)
                .next(withInternalize)
                .next(withRetry, settledOptions)
                .next(withHTTP)
                .next(withExternalize)
                .done();

            return cache.baseQuery(...args);
        }

        function safeQuery(...args: Parameters<GlobalThisFetch>): QueryPromise<Safe<QueryResponse, unknown>> {
            cache.safeQuery ??= pipe(settledFn)
                .next(withInternalize)
                .next(withRetry, settledOptions)
                .next(withHTTP)
                .next(withExternalize)
                .next(withSafe)
                .done();

            return cache.safeQuery(...args);
        }
    }
} as QueryConstructor;

const query = new Query();

export { Query, query };
