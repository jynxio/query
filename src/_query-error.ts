import type { SchemaError } from "./_standard-schema/err.ts";

type Cause =
    | { type: "timeout" }
    | { type: "abortion" }
    | { type: "json"; details: SchemaError }
    | {
          type: "http";
          details: {
              response: Response;
              statusCode: number;
              statusText: string;
              statusError: () => Promise<unknown>;
          };
      };

class QueryError extends Error {
    declare cause: Cause;

    constructor(cause: Cause) {
        super(undefined, { cause });
        this.name = "QueryError";
    }

    static exclude<T>(i: T): Exclude<T, QueryError> | undefined {
        if (i instanceof QueryError) return;

        return i as Exclude<T, QueryError>;
    }
}

export { QueryError };
