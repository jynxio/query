import { QueryError } from "../_query-error.ts";

const ABORT_ERROR_NAME = "AbortError";
const TIMEOUT_ERROR_NAME = "TimeoutError";

function isError(i: unknown): i is Error {
    return i instanceof Error;
}

function isTimeoutError(i: unknown): boolean {
    if (isError(i) && i.name === TIMEOUT_ERROR_NAME) return true;
    if (QueryError.is(i) && i.cause.type === "timeout") return true;

    return false;
}

function isAbortedError(i: unknown): boolean {
    if (isError(i) && i.name === ABORT_ERROR_NAME) return true;
    if (QueryError.is(i) && i.cause.type === "abortion") return true;

    return false;
}

export { isAbortedError, isTimeoutError, isError };
