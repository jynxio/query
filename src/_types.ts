import type { StandardSchemaV1 as SSV1 } from "@standard-schema/spec";
import type { QueryRequest } from "./_request.ts";
import type { QueryResponse } from "./_response.ts";

type ValueOf<T> = T[keyof T];
type Awaitable<T> = T | PromiseLike<T>;
type EmptyObj = Record<PropertyKey, never>;
type Same<A, B> = A extends B ? (B extends A ? true : false) : false;
type TypedOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] };
type Safe<T, E extends Error> = { ok: false; error: E } | { ok: true; data: T };

type JSONText = string;
type JSONData = null | boolean | number | string | JSONData[] | { [key: string]: JSONData };

type FetchLike = (typeof globalThis)["fetch"];
type QueryFetch = (request: QueryRequest) => Promise<QueryResponse>;
type JsonifiableResponse = TypedOmit<Response, "json"> & {
    json: {
        (): Promise<JSONData>;
        <T extends SSV1>(schema: T): Promise<SSV1.InferOutput<T>>;
        <T extends SSV1>(schema?: T): Promise<SSV1.InferOutput<T> | JSONData>;
    };
};

export type {
    Same,
    Safe,
    ValueOf,
    EmptyObj,
    Awaitable,
    TypedOmit,
    JSONText,
    JSONData,
    FetchLike,
    AbortableFetchLike,
    JsonifiableResponse,
};
