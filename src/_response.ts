import type { JSONData } from "./_types.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";

import { SchemaError } from "@standard-schema/utils";

class QueryResponse extends Response {
    static readonly cast = cast;
    public readonly json = json;
    public readonly clone = clone;

    constructor(...args: ConstructorParameters<typeof Response>) {
        super(...args);
        this.json = json;
        this.clone = clone;
    }
}

function cast(i: Response): QueryResponse {
    return Object.assign(i, { json, clone });
}

function clone(this: QueryResponse): QueryResponse {
    const response = Response.prototype.clone.call(this);

    return Object.assign(response, { json, clone }) as QueryResponse;
}

function json(): Promise<JSONData>;
function json<T extends StandardSchemaV1>(schema: T): Promise<StandardSchemaV1.InferOutput<T>>;
async function json<T extends StandardSchemaV1>(
    this: QueryResponse,
    schema?: T,
): Promise<JSONData | StandardSchemaV1.InferOutput<T>> {
    const jsonData = (await Response.prototype.json.call(this)) as JSONData;
    if (!schema) return jsonData;

    const validatedJSONData = await schema["~standard"].validate(jsonData);
    if (!validatedJSONData.issues) return validatedJSONData.value;

    throw new SchemaError(validatedJSONData.issues);
}

export { QueryResponse };
