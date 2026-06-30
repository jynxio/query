import type { FetcherArgs, TypedOmit, Awaitable, Fetcher } from "./_utils/types.ts";
import type { Validate } from "./_hooks/with-json.ts";
import type { QueryError } from "./_error.ts";

type QueryResponse = TypedOmit<Response, "json"> & { json: Validate };

type QueryOptions = {
    attemptTimeout: number;
    overallTimeout: number;
    retry: (input: {
        attemptCount: number;
        lastAttemptInput: Request;
        lastAttemptOutput: Response | Error;
    }) => Readonly<[should: false] | [should: true, delay: number]>;
};

type QueryConstructor = {
    new (opts?: QueryOptions, fetcher?: Fetcher): QueryInstance;
};

type QueryInstance<T = QueryResponse> = {
    (...fetchArgs: FetcherArgs): Omit<Promise<T>, "then" | "catch"> & {
        then: <NextRes = T, Fallback = never>(
            onResolved?: (res: T) => Awaitable<NextRes>,
            onRejected?: (err: unknown) => Awaitable<Fallback>,
        ) => ReturnType<QueryInstance<Awaited<NextRes | Fallback>>>;

        catch: <Fallback = never>(
            onRejected?: (err: unknown) => Awaitable<Fallback>,
        ) => ReturnType<QueryInstance<Awaited<T | Fallback>>>;
    };
};

namespace Query {
    export type Error = QueryError;
    export type Response = QueryResponse;

    export type Instance = QueryInstance;
    export type Constructor = QueryConstructor;

    export type Options = QueryOptions;
}

export type { Query };
