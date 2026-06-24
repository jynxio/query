import type { StandardSchemaV1 as SSV1 } from "../_standard-schema/spec.ts";

// TODO(QueryError): Replace deprecated YakError with QueryError if this deprecated hook remains in the package.
import { YakError } from "../_deprecated-err.ts";
import { SchemaError } from "../_standard-schema/err.ts";

const NO_BODY_STATUS_CODE = new Set([101, 204, 205, 304]);

function toJSON<T extends SSV1>(schema: T): (res: Response) => Promise<SSV1.InferOutput<T>>;
function toJSON<T = unknown>(): (res: Response) => Promise<T | undefined>;
function toJSON(schema?: SSV1) {
    return async (res: Response) => {
        const isNoBody = res.body === null || NO_BODY_STATUS_CODE.has(res.status);
        const raw = isNoBody ? undefined : await unsafe(res.json());

        if (!schema) return raw;

        const validatedResult = await schema["~standard"].validate(raw);
        if (!validatedResult.issues) return validatedResult.value;

        // TODO(QueryError): Throw QueryError("validation") here if this hook remains active.
        throw new YakError("validation", { cause: new SchemaError(validatedResult.issues) });
    };
}

async function unsafe<T>(task: Promise<T>): Promise<T> {
    try {
        return await task;
    } catch (error) {
        // TODO(QueryError): Throw QueryError("unknown") here if this hook remains active.
        throw new YakError("unknown", { cause: error });
    }
}

export { toJSON };
