import type { StandardSchemaV1 as SSV1 } from "./_standard-schema/spec.ts";

// TODO(QueryError): Replace deprecated YakError with QueryError for validation failures.
import { YakError } from "./_deprecated-err.ts";
import { SchemaError } from "./_standard-schema/err.ts";

function withJSON(primitiveJSON: () => Promise<unknown>) {
    return validatedJSON;

    async function validatedJSON<T extends SSV1>(schema: T): Promise<SSV1.InferOutput<T>>;
    async function validatedJSON<T = unknown>(): Promise<T>;
    async function validatedJSON(schema?: SSV1) {
        // TODO(QueryError): primitiveJSON failures currently escape raw; decide whether Query boundary wraps them as QueryError("unknown").
        const raw = await primitiveJSON();
        if (!schema) return raw;

        // TODO(QueryError): schema validate throw/reject currently escapes raw; decide whether it should become QueryError("unknown").
        const validatedResult = await schema["~standard"].validate(raw);
        if (!validatedResult.issues) return validatedResult.value;

        // TODO(QueryError): Throw QueryError("validation") here.
        throw new YakError("validation", { cause: new SchemaError(validatedResult.issues) });
    }
}

export { withJSON };
