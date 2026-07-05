import type { QueryErrorCtor, QueryErrorInst, QueryErrorCause } from "../_error.ts";
import type { Awaitable, TypedOmit, Safe, FetchArgs } from "../_types.ts";
import type { QueryOpts } from "../_opts.ts";
import type { SchematicRes as QueryRes } from "../_types.ts";

type QueryCtor = {
    Error: QueryErrorCtor;
    new (opts?: Partial<QueryOpts>, fn?: (...i: FetchArgs) => Promise<Response>): QueryInst;
};

type QueryInst = _QueryInst & { safe: _QueryInst<Safe<QueryRes, QueryErrorInst>, never> };
type _QueryInst<T = QueryRes, E = QueryErrorInst> = {
    (...args: FetchArgs): TypedOmit<Promise<T>, "then" | "catch"> & {
        then: <NextResponse = T, Fallback = never>(
            onResolved?: (response: T) => Awaitable<NextResponse>,
            onRejected?: (error: E) => Awaitable<Fallback>,
        ) => ReturnType<_QueryInst<Awaited<NextResponse | Fallback>, unknown>>;

        catch: <Fallback = never>(
            onRejected?: (error: E) => Awaitable<Fallback>,
        ) => ReturnType<_QueryInst<Awaited<T | Fallback>, unknown>>;
    };
};

export type { QueryRes, QueryOpts, QueryCtor, QueryInst };

export type { QueryErrorInst, QueryErrorCtor, QueryErrorCause };
