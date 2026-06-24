function toError(i: unknown): Error {
    if (i instanceof Error) return i;

    // TODO(QueryError): Convert non-Error reasons to QueryError("unknown") at the chosen boundary.
    return new Error(String(i)); // TODO: 或许有必要主动转换成我自定义的 unknown error
}

export { toError };
