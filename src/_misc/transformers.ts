import type { FetchArgs, JSONData } from "../_types.ts";

import { QueryError } from "../_error.ts";
import { isError, isRequest } from "./guards.ts";

function toJSON(i: string): JSONData {
    return JSON.parse(i);
}

function toError(i: unknown): Error {
    if (isError(i)) return i;

    return new Error(String(i));
}

function toQueryError(i: unknown): QueryError {
    if (i instanceof QueryError) return i;

    return new QueryError("unknown", toError(i));
}

/**
 * Keeps Request as-is when no init is given.
 *
 * @remarks
 * Node drops referrerPolicy with new Request(request).
 */
function toRequest(...args: FetchArgs): Request {
    if (isRequest(args[0]) && args[1] === undefined) return args[0];

    return new Request(...args);
}

export { toJSON, toError, toQueryError, toRequest };
