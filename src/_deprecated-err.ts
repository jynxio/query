import type { UnionToIntersection } from "./_misc/types.ts";
import type { SchemaError } from "./_standard-schema/err.ts";

type Type = keyof Spec;
type Spec = {
    network: { cause?: unknown };
    aborted: { cause?: unknown };
    timeout: { cause?: unknown };
    unknown: { cause?: unknown };

    http: {
        cause: {
            response: Response;
            statusCode: number;
            statusText: string;
            statusError: () => Promise<unknown>;
        };
    };
    validation: { cause: SchemaError };
};

type YakError<T extends Type = Type> = Omit<Error, "type" | "cause"> & Readonly<{ type: T } & Spec[T]>;
type YakErrorConstructor = UnionToIntersection<
    { [T in Type]: { new (type: T, init: Spec[T]): YakError<T> } }[Type]
>;

// TODO(QueryError): Remove this deprecated error class after every caller moves to QueryError.
const YakError = class extends Error {
    readonly type: Type;

    constructor(type: Type, init: Spec[Type]) {
        super(type, { cause: init.cause });

        this.type = type;
        this.name = "YakError";
    }
} as YakErrorConstructor;

export { YakError };
export type { Type as YakErrorType };
