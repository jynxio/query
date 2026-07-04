import type { SchematicRes, JSONData } from "../_types.ts";
import type { StandardSchemaV1 as SSV1 } from "@standard-schema/spec";

import { SchemaError } from "@standard-schema/utils";
import { QueryError } from "../_error.ts";

function withJSON<Args extends unknown[]>(
    fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<SchematicRes> {
    return async function (...args: Args): Promise<SchematicRes> {
        const rawResponse = await fn(...args);
        const rawJSON = rawResponse.json.bind(rawResponse);
        const response = Object.assign(rawResponse, { json });

        return response;

        async function json(): Promise<JSONData>;
        async function json<T extends SSV1>(schema: T): Promise<SSV1.InferOutput<T>>;
        async function json<T extends SSV1>(schema?: T): Promise<SSV1.InferOutput<T> | JSONData> {
            const jsonData = (await rawJSON()) as JSONData;
            if (!schema) return jsonData;

            const validatedJSONData = await schema["~standard"].validate(jsonData);
            if (!validatedJSONData.issues) return validatedJSONData.value;

            throw new QueryError("json", new SchemaError(validatedJSONData.issues));
        }
    };
}

export { withJSON };
