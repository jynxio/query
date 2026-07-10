import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { SchemaError } from "@standard-schema/utils";
import type { QueryPromise } from "../src/_promise.ts";

import { describe, expectTypeOf, test } from "vite-plus/test";
import { Query, query } from "../src/index.ts";

type JSONData = null | boolean | number | string | JSONData[] | { [key: string]: JSONData };
type QueryConstructor = typeof Query;
type QueryInstance = InstanceType<QueryConstructor>;
type QueryResponse = Awaited<ReturnType<QueryInstance>>;
type QueryError = InstanceType<typeof Query.Error>;
type QueryOptions = Required<NonNullable<ConstructorParameters<QueryConstructor>[0]>>;

describe("Fetch shape types", () => {
    test("Uses Fetch parameters", () => {
        expectTypeOf<Parameters<QueryInstance>>().toEqualTypeOf<Parameters<typeof fetch>>();
        expectTypeOf<Parameters<QueryInstance["safe"]>>().toEqualTypeOf<Parameters<typeof fetch>>();
        expectTypeOf(query).toEqualTypeOf<QueryInstance>();
    });
});

describe("Query types", () => {
    test("Exposes constructor and error types", () => {
        function assertConstructors() {
            const ctor: QueryConstructor = Query;
            const query = new ctor(
                {
                    attemptTimeout: 1,
                    overallTimeout: 2,
                    retry: () => ({ should: false }),
                },
                async () => new Response(),
            );

            new Query.Error("timeout");
            new Query.Error("abortion");
            new Query.Error("unknown", new Error("unknown"));
            new Query.Error("http", {
                response: {} as QueryResponse,
                statusCode: 500,
                statusText: "Internal Server Error",
                statusError: async () => null,
            });
            new Query.Error("json", {} as SchemaError);

            expectTypeOf(query).toEqualTypeOf<QueryInstance>();
        }

        expectTypeOf(assertConstructors).toEqualTypeOf<() => void>();
    });

    test("Exposes unknown in then and catch", () => {
        function assertThenCatch(query: QueryInstance) {
            query("https://example.com").then(
                (response) => {
                    expectTypeOf(response).toEqualTypeOf<QueryResponse>();
                    return response;
                },
                (error) => {
                    expectTypeOf(error).toEqualTypeOf<unknown>();
                    return error;
                },
            );

            query("https://example.com").catch((error) => {
                expectTypeOf(error).toEqualTypeOf<unknown>();
                return error;
            });
        }

        expectTypeOf(assertThenCatch).toEqualTypeOf<(query: QueryInstance) => void>();
    });

    test("Narrows safe results", () => {
        function assertSafe(result: Awaited<ReturnType<QueryInstance["safe"]>>) {
            if (result.ok) {
                expectTypeOf(result.data).toEqualTypeOf<QueryResponse>();
            } else {
                expectTypeOf(result.error).toEqualTypeOf<QueryError>();
            }
        }

        expectTypeOf(assertSafe).toEqualTypeOf<
            (result: Awaited<ReturnType<QueryInstance["safe"]>>) => void
        >();
    });

    test("Exposes retry and error details", () => {
        type PrevAttempt = Parameters<QueryOptions["retry"]>[0];
        type RetryResult = ReturnType<QueryOptions["retry"]>;

        const jsonError = new Query.Error("json", {} as SchemaError);
        const httpError = new Query.Error("http", {
            response: {} as QueryResponse,
            statusCode: 500,
            statusText: "Internal Server Error",
            statusError: async () => null,
        });

        expectTypeOf<PrevAttempt["no"]>().toEqualTypeOf<number>();
        expectTypeOf<PrevAttempt["input"]>().toEqualTypeOf<Request>();
        expectTypeOf<PrevAttempt["output"]>().toEqualTypeOf<QueryResponse | QueryError>();
        expectTypeOf<RetryResult>().toEqualTypeOf<
            Readonly<{ should: false } | { should: true; delay: number }>
        >();
        expectTypeOf(jsonError.cause.details).toEqualTypeOf<SchemaError>();
        expectTypeOf<ReturnType<typeof httpError.cause.details.statusError>>().toEqualTypeOf<
            QueryPromise<JSONData>
        >();
    });

    test("Exposes JSON output types", () => {
        async function assertJSON(
            response: QueryResponse,
            schema: StandardSchemaV1<unknown, { id: string }>,
        ) {
            const raw = await response.json();
            const parsed = await response.json(schema);

            expectTypeOf(raw).toEqualTypeOf<JSONData>();
            expectTypeOf(parsed).toEqualTypeOf<{ id: string }>();
        }

        expectTypeOf(assertJSON).toEqualTypeOf<
            (response: QueryResponse, schema: StandardSchemaV1<unknown, { id: string }>) => Promise<void>
        >();
    });
});
