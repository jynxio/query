import type { StandardSchemaV1 as SSV1 } from "../_standard-schema/spec.ts";
import type { TypedJSON, Fetcher, FetcherArgs } from "../_utils/types.ts";

import { SchemaError } from "../_standard-schema/err.ts";
import { QueryError } from "../_error.ts";

function withJSON(fetcher: Fetcher) {
    return async function (...args: FetcherArgs) {
        const originalResponse = await fetcher(...args);
        const originalJSON = originalResponse.json.bind(originalResponse);
        const modifiedResponse = Object.assign(originalResponse, { json: modifiedJSON });

        return modifiedResponse;

        async function modifiedJSON(): Promise<TypedJSON>;
        async function modifiedJSON<T extends SSV1>(schema: T): Promise<SSV1.InferOutput<T>>;
        async function modifiedJSON<T extends SSV1>(schema?: SSV1): Promise<SSV1.InferOutput<T> | TypedJSON> {
            const jsonData = (await originalJSON()) as TypedJSON;
            if (!schema) return jsonData;

            const validatedJSONData = await schema["~standard"].validate(jsonData);
            if (!validatedJSONData.issues) return validatedJSONData.value;

            throw new QueryError({ type: "json", details: new SchemaError(validatedJSONData.issues) });
        }
    };
}

export { withJSON };
