import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { QueryPromise } from "../src/_promise.ts";

import { describe, expectTypeOf, test } from "vite-plus/test";
import { Query, query } from "../src/index.ts";

type JSONData = null | boolean | number | string | JSONData[] | { [key: string]: JSONData };
type QueryConstructor = typeof Query;
type QueryInstance = InstanceType<QueryConstructor>;
type QueryResponse = Awaited<ReturnType<QueryInstance>>;
type QueryOptions = Required<NonNullable<ConstructorParameters<QueryConstructor>[0]>>;

describe("Fetch shape types", () => {
    test("Uses Fetch parameters", () => {
        expectTypeOf<Parameters<QueryInstance>>().toEqualTypeOf<Parameters<typeof fetch>>();
        expectTypeOf<Parameters<QueryInstance["safe"]>>().toEqualTypeOf<Parameters<typeof fetch>>();
        expectTypeOf<ReturnType<QueryInstance>>().toEqualTypeOf<QueryPromise<QueryResponse>>();
        expectTypeOf(query).toEqualTypeOf<QueryInstance>();
    });
});

describe("Query types", () => {
    test("Exposes constructor and static members", () => {
        function assertConstructors() {
            const ctor: QueryConstructor = Query;
            const query = new ctor(
                {
                    attemptTimeout: 1,
                    overallTimeout: 2,
                    shouldRetry: () => false,
                    shouldThrow: () => true,
                },
                async () => new Response(),
            );

            expectTypeOf(Query.Request).toEqualTypeOf<QueryConstructor["Request"]>();
            expectTypeOf(Query.Response).toEqualTypeOf<QueryConstructor["Response"]>();
            expectTypeOf(Query.Promise).toEqualTypeOf<QueryConstructor["Promise"]>();
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

    test("Preserves QueryPromise types through chains", () => {
        function assertChains(query: QueryInstance) {
            const mapped = query("https://example.com").then(() => 1);
            const recovered = query("https://example.com").catch(() => "fallback" as const);
            const finalized = query("https://example.com").finally(() => {});
            const combined = query("https://example.com")
                .then(
                    () => 1,
                    () => "fallback" as const,
                )
                .then((value) => value);

            expectTypeOf(mapped).toEqualTypeOf<QueryPromise<number>>();
            expectTypeOf(recovered).toEqualTypeOf<QueryPromise<QueryResponse | "fallback">>();
            expectTypeOf(finalized).toEqualTypeOf<QueryPromise<QueryResponse>>();
            expectTypeOf(combined).toEqualTypeOf<QueryPromise<number | "fallback">>();
        }

        const nativePromise: QueryPromise<number> = Promise.resolve(1);

        expectTypeOf(assertChains).toEqualTypeOf<(query: QueryInstance) => void>();
        expectTypeOf(nativePromise).toEqualTypeOf<QueryPromise<number>>();
    });

    test("Narrows safe results", () => {
        function assertSafe(result: Awaited<ReturnType<QueryInstance["safe"]>>) {
            if (result.ok) {
                expectTypeOf(result.data).toEqualTypeOf<QueryResponse>();
            } else {
                expectTypeOf(result.error).toEqualTypeOf<unknown>();
            }
        }

        expectTypeOf(assertSafe).toEqualTypeOf<
            (result: Awaited<ReturnType<QueryInstance["safe"]>>) => void
        >();
    });

    test("Exposes retry and throw option details", () => {
        type PrevAttempt = Parameters<QueryOptions["shouldRetry"]>[0];
        type RetryResult = ReturnType<QueryOptions["shouldRetry"]>;

        expectTypeOf<PrevAttempt["no"]>().toEqualTypeOf<number>();
        expectTypeOf<PrevAttempt["input"]>().toEqualTypeOf<Request>();
        expectTypeOf<PrevAttempt["output"]>().toEqualTypeOf<
            { ok: true; data: QueryResponse } | { ok: false; error: unknown }
        >();
        expectTypeOf<RetryResult>().toEqualTypeOf<false | number>();

        expectTypeOf<Parameters<QueryOptions["shouldThrow"]>[0]>().toEqualTypeOf<QueryResponse>();
        expectTypeOf<ReturnType<QueryOptions["shouldThrow"]>>().toEqualTypeOf<boolean>();
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
