import type { StandardSchemaV1 } from "@standard-schema/spec";

function createSchema<Input, Output>(
    validate: (value: Input) => StandardSchemaV1.Result<Output> | Promise<StandardSchemaV1.Result<Output>>,
): StandardSchemaV1<Input, Output> {
    return {
        "~standard": {
            version: 1,
            vendor: "test",
            validate: (value) => validate(value as Input),
        },
    };
}

export { createSchema };
