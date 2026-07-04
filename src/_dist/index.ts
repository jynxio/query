import type { QueryRes, QueryOpts, QueryCtor, QueryInst } from "./_types.ts";
import type { QueryErrorInst, QueryErrorCtor, QueryErrorCause } from "./_types.ts";
import type { FetchArgs } from "../_types.ts";

import { QUERY_OPTS } from "../_opts.ts";
import { createRoot, createSafe } from "../_factory.ts";
import { QueryError } from "../_error.ts";

type Query = QueryInst;
type QueryType = {
    // Query
    Res: QueryRes;
    Opts: QueryOpts;
    Ctor: QueryCtor;
    Inst: QueryInst;

    // QueryError
    ErrorInst: QueryErrorInst;
    ErrorCtor: QueryErrorCtor;
    ErrorCause: QueryErrorCause;
};

const Query = Object.assign(_Query, { Error: QueryError }) as unknown as QueryCtor;
const query = new Query();

function _Query(
    opts: Partial<QueryOpts> = {},
    fn: (...i: FetchArgs) => Promise<Response> = globalThis.fetch,
): QueryInst {
    type RootArgs = Parameters<Root>;
    type SafeArgs = Parameters<Safe>;
    type Root = ReturnType<typeof createRoot>;
    type Safe = ReturnType<typeof createSafe>;

    let rootKernel: Root | undefined;
    let safeKernel: Safe | undefined;

    const mergedOpts = { ...QUERY_OPTS, ...opts } satisfies QueryOpts;
    const rootShell = (...i: RootArgs) => (rootKernel ??= createRoot(mergedOpts, fn))(...i);
    const safeShell = (...i: SafeArgs) => (safeKernel ??= createSafe(mergedOpts, fn))(...i);

    return Object.assign(rootShell, { safe: safeShell }) as QueryInst;
}

export { Query, query };
export type { QueryType };
