import { QueryError } from "../_error.ts";

const ABORT_ERROR_NAME = "AbortError";
const TIMEOUT_ERROR_NAME = "TimeoutError";

function isError(i: unknown): i is Error {
    return i instanceof Error;
}

function isQueryError(i: unknown): i is QueryError {
    return i instanceof QueryError;
}

function isTimeoutError(i: unknown): boolean {
    if (isError(i) && i.name === TIMEOUT_ERROR_NAME) return true;
    if (i instanceof QueryError && i.cause.type === "timeout") return true;

    return false;
}

function isAbortedError(i: unknown): boolean {
    if (isError(i) && i.name === ABORT_ERROR_NAME) return true;
    if (i instanceof QueryError && i.cause.type === "abort") return true;

    return false;
}

/**
 * From Ky.
 *
 * @see {@link https://github.com/sindresorhus/ky/blob/61d6d66d27911001b9b4d57ab93139f9ad61384b/source/core/Ky.ts#L78}
 */
function isRequest(i: unknown): i is Request {
    if (typeof globalThis.Request === "function" && i instanceof globalThis.Request) return true;
    if (Object.prototype.toString.call(i) === "[object Request]") return true;

    return false;
}

/**
 * From Ky.
 *
 * @see {@link https://github.com/sindresorhus/ky/blob/61d6d66d27911001b9b4d57ab93139f9ad61384b/source/core/Ky.ts#L84}
 */
function isResponse(i: unknown): i is Response {
    if (typeof globalThis.Response === "function" && i instanceof globalThis.Response) return true;
    if (Object.prototype.toString.call(i) === "[object Response]") return true;

    return false;
}

export { isAbortedError, isRequest, isResponse, isTimeoutError, isError, isQueryError };
