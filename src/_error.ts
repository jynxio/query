import type { SchematicRes } from "./_types.ts";

import { SchemaError } from "@standard-schema/utils";

type Inst = QueryError;
type Ctor = typeof QueryError;
type Cause = { unknown: unknown; timeout: never; abortion: never; json: JSONCause; http: HTTPCause };
type JSONCause = SchemaError;
type HTTPCause = {
    statusCode: number;
    statusText: string;
    response: SchematicRes;
    statusError: () => Promise<unknown>;
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
export type { Cause as QueryErrorCause, Inst as QueryErrorInst, Ctor as QueryErrorCtor };
