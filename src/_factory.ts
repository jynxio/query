import type { QueryOpts } from "./_opts.ts";
import type { QueryError } from "./_error.ts";
import type { FetchArgs, Safe, SchematicRes } from "./_types.ts";

import { withRetry } from "./_hooks/with-retry.ts";
import { withJSON } from "./_hooks/with-json.ts";
import { withHTTP } from "./_hooks/with-http.ts";
import { withError } from "./_hooks/with-error.ts";
import { withSafe } from "./_hooks/with-safe.ts";

function createRoot(
    opts: QueryOpts,
    fn: (...i: FetchArgs) => Promise<Response>,
): (...i: FetchArgs) => Promise<SchematicRes> {
    return withError(withHTTP(withRetry(withJSON(withError(fn)), opts)));
}

function createSafe(
    opts: QueryOpts,
    fn: (...i: FetchArgs) => Promise<Response>,
): (...i: FetchArgs) => Promise<Safe<SchematicRes, QueryError>> {
    return withSafe(createRoot(opts, fn));
}

export { createRoot, createSafe };
