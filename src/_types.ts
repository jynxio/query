import type { StandardSchemaV1 as SSV1 } from "@standard-schema/spec";

type ValueOf<T> = T[keyof T];
type Awaitable<T> = T | PromiseLike<T>;
type TypedOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] };
type Safe<T, E extends Error> = { ok: false; error: E } | { ok: true; data: T };

type FetchArgs = Parameters<(typeof globalThis)["fetch"]>;

type JSONText = string;
type JSONData = null | boolean | number | string | JSONData[] | { [key: string]: JSONData };

type SchematicRes = TypedOmit<Response, "json"> & { json: SchematicJSONMethod };
type SchematicJSONMethod = { (): Promise<JSONData>; <T extends SSV1>(i: T): Promise<SSV1.InferOutput<T>> };

export type { Safe, ValueOf, Awaitable, TypedOmit, FetchArgs, JSONText, JSONData, SchematicRes };
