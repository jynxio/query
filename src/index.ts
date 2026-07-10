import type { QueryOptions } from "./_options.ts";
import type { QueryPromise } from "./_promise.ts";
import type { GlobalthisFetch, Safe } from "./_types.ts";

import { DEFAULT_QUERY_OPTIONS } from "./_options.ts";
import { withRetry } from "./_hooks/with-retry.ts";
import { withHTTP } from "./_hooks/with-http.ts";
import { withError } from "./_hooks/with-error.ts";
import { withSafe } from "./_hooks/with-safe.ts";
import { QueryResponse } from "./_response.ts";
import { withExternalize, withInternalize } from "./_hooks/with-transform.ts";
import { withPipe } from "./_hooks/with-pipe.ts";
import { QueryError } from "./_error.ts";

type QueryCall<Result> = {
    /**
     * @deprecated It's supported but not recommended.
     */
    (input: Request, init?: Record<PropertyKey, never>): QueryPromise<Result>;
    (input: Parameters<GlobalthisFetch>[0], init?: Parameters<GlobalthisFetch>[1]): QueryPromise<Result>;
};
type Query = BaseQuery & { safe: SafeQuery };
type BaseQuery = QueryCall<QueryResponse>;
type SafeQuery = QueryCall<Safe<QueryResponse, QueryError>>;
type QueryConstructor = {
    new (options?: Partial<QueryOptions>, fn?: GlobalthisFetch): Query;
    Error: typeof QueryError;
};

const Query = class {
    static readonly Error: typeof QueryError = QueryError;

    constructor(options?: Partial<QueryOptions>, fn?: GlobalthisFetch) {
        type Cache = { baseQuery?: BaseQuery; safeQuery?: SafeQuery };

        const cache: Cache = {};
        const resolvedFn = fn ?? globalThis.fetch;
        const resolvedOptions = { ...DEFAULT_QUERY_OPTIONS, ...options } satisfies QueryOptions;

        return Object.assign(baseQuery, { safe: safeQuery });

        function baseQuery(...args: Parameters<GlobalthisFetch>): QueryPromise<QueryResponse> {
            cache.baseQuery ??= withPipe(resolvedFn)
                .next(withInternalize)
                .next(withError)
                .next((i) => withRetry(i, resolvedOptions))
                .next(withHTTP)
                .next(withError)
                .next(withExternalize)
                .done();

            return cache.baseQuery(...args);
        }

        function safeQuery(
            ...args: Parameters<GlobalthisFetch>
        ): QueryPromise<Safe<QueryResponse, QueryError>> {
            cache.safeQuery ??= withPipe(resolvedFn)
                .next(withInternalize)
                .next(withError)
                .next((i) => withRetry(i, resolvedOptions))
                .next(withHTTP)
                .next(withError)
                .next(withExternalize)
                .next(withSafe)
                .done();

            return cache.safeQuery(...args);
        }
    }
} as QueryConstructor;

const query = new Query();

export { Query, query };
