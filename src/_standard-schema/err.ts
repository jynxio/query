import type { StandardSchemaV1 } from "./spec.ts";

/**
 * A schema error with useful information
 * @see {@link https://github.com/standard-schema/standard-schema/tree/main/packages/utils}
 */
// TODO(QueryError): Keep SchemaError as QueryError("validation").cause, or route direct schema errors through QueryError too.
class SchemaError extends Error {
  public readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;

  constructor(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
    super(issues[0]!.message);
    this.name = "SchemaError";
    this.issues = issues;
  }
}

export { SchemaError };
