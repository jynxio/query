import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { SchemaError } from "@standard-schema/utils";

import { describe, expectTypeOf, test } from "vite-plus/test";
import { Query, query, type QueryType } from "../src/index.ts";

type JSONData = null | boolean | number | string | JSONData[] | { [key: string]: JSONData };

describe("Fetch shape types", () => {
    test("Uses Fetch parameters", () => {
        expectTypeOf<Parameters<QueryType["Inst"]>>().toEqualTypeOf<Parameters<typeof fetch>>();
        expectTypeOf<Parameters<QueryType["Inst"]["safe"]>>().toEqualTypeOf<Parameters<typeof fetch>>();
        expectTypeOf(query).toEqualTypeOf<QueryType["Inst"]>();
    });
});

describe("Query types", () => {
    test("Exposes constructor and error types", () => {
        function assertConstructors() {
            const ctor: QueryType["Ctor"] = Query;
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
            new Query.Error("http", {} as QueryType["ErrorCause"]["http"]);
            new Query.Error("json", {} as QueryType["ErrorCause"]["json"]);

            expectTypeOf(query).toEqualTypeOf<QueryType["Inst"]>();
        }

        expectTypeOf(assertConstructors).toEqualTypeOf<() => void>();
    });

    test("Exposes Query.Error in then and catch", () => {
        function assertThenCatch(query: QueryType["Inst"]) {
            query("https://example.com").then(
                (response) => {
                    expectTypeOf(response).toEqualTypeOf<QueryType["Res"]>();
                    return response;
                },
                (error) => {
                    expectTypeOf(error).toEqualTypeOf<QueryType["ErrorInst"]>();
                    return error;
                },
            );

            query("https://example.com").catch((error) => {
                expectTypeOf(error).toEqualTypeOf<QueryType["ErrorInst"]>();
                return error;
            });
        }

        expectTypeOf(assertThenCatch).toEqualTypeOf<(query: QueryType["Inst"]) => void>();
    });

    test("Narrows safe results", () => {
        function assertSafe(result: Awaited<ReturnType<QueryType["Inst"]["safe"]>>) {
            if (result.ok) {
                expectTypeOf(result.data).toEqualTypeOf<QueryType["Res"]>();
            } else {
                expectTypeOf(result.error).toEqualTypeOf<QueryType["ErrorInst"]>();
            }
        }

        expectTypeOf(assertSafe).toEqualTypeOf<
            (result: Awaited<ReturnType<QueryType["Inst"]["safe"]>>) => void
        >();
    });

    test("Exposes retry and error details", () => {
        type PrevAttempt = Parameters<QueryType["Opts"]["retry"]>[0];
        type RetryResult = ReturnType<QueryType["Opts"]["retry"]>;
        type Cause = QueryType["ErrorCause"];

        expectTypeOf<PrevAttempt["no"]>().toEqualTypeOf<number>();
        expectTypeOf<PrevAttempt["input"]>().toEqualTypeOf<Request>();
        expectTypeOf<PrevAttempt["output"]>().toEqualTypeOf<QueryType["Res"] | QueryType["ErrorInst"]>();
        expectTypeOf<RetryResult>().toEqualTypeOf<
            Readonly<{ should: false } | { should: true; delay: number }>
        >();
        expectTypeOf<Cause["json"]>().toEqualTypeOf<SchemaError>();
        expectTypeOf<ReturnType<Cause["http"]["statusError"]>>().toEqualTypeOf<Promise<unknown>>();
    });

    test("Exposes JSON output types", () => {
        async function assertJSON(
            response: QueryType["Res"],
            schema: StandardSchemaV1<unknown, { id: string }>,
        ) {
            const raw = await response.json();
            const parsed = await response.json(schema);

            expectTypeOf(raw).toEqualTypeOf<JSONData>();
            expectTypeOf(parsed).toEqualTypeOf<{ id: string }>();
        }

        expectTypeOf(assertJSON).toEqualTypeOf<
            (response: QueryType["Res"], schema: StandardSchemaV1<unknown, { id: string }>) => Promise<void>
        >();
    });
});
