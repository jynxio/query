import type { StandardSchemaV1 as SSV1 } from "../_standard-schema/spec.ts";

import { SchemaError } from "../_standard-schema/err.ts";
import { QueryError } from "../_query-error.ts";

import type { JSONData } from "../to-json-data.ts";

function withValidate(getJSONData: () => Promise<unknown>) {
    return getValidatedJSONData;

    async function getValidatedJSONData<T extends SSV1>(schema: T): Promise<SSV1.InferOutput<T>>;
    async function getValidatedJSONData(): Promise<JSONData>;
    async function getValidatedJSONData<T extends SSV1>(
        schema?: SSV1,
    ): Promise<SSV1.InferOutput<T> | JSONData> {
        const jsonData = (await getJSONData()) as JSONData;
        if (!schema) return jsonData;

        const validatedJSONData = await schema["~standard"].validate(jsonData);
        if (!validatedJSONData.issues) return validatedJSONData.value;

        throw new QueryError({ type: "json", details: new SchemaError(validatedJSONData.issues) });
    }
}

export { withValidate };
