import type { QueryPromise } from "./_promise.ts";
import type { QueryResponse } from "./_response.ts";
import type { JSONData } from "./_types.ts";

import { SchemaError } from "@standard-schema/utils";

type Cause = {
    unknown: unknown;
    timeout: never;
    abort: never;
    json: SchemaError;
    http: {
        statusCode: number;
        statusText: string;
        response: QueryResponse;
        statusError: (signal?: AbortSignal) => QueryPromise<JSONData>;
    };
};

class QueryError<T extends keyof Cause = keyof Cause> extends Error {
    declare name: "QueryError";
    declare cause: { type: T; details: Cause[T] };

    constructor(...[type, details]: Cause[T] extends never ? [T] : [T, Cause[T]]) {
        super(undefined, { cause: { type, details } });
        this.name = "QueryError";
    }
}

export { QueryError };
export type { Cause as QueryErrorCause };
