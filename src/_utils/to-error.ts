import { isError } from "./is-error.ts";

function toError(i: unknown): Error {
    if (isError(i)) return i;

    return new Error(String(i));
}

export { toError };
