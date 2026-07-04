import type { JSONData } from "../_types.ts";

import { QueryError } from "../_error.ts";
import { isError } from "./guards.ts";

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

export { toJSON, toError, toQueryError };
