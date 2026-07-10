import type { QueryPromise } from "./_promise.ts";
import type { QueryRequest } from "./_request.ts";
import type { QueryResponse } from "./_response.ts";

type ValueOf<T> = T[keyof T];
type TypedOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] };
type Safe<T, E extends Error> = { ok: false; error: E } | { ok: true; data: T };

type GlobalThisFetch = (typeof globalThis)["fetch"];
type NormalizedFetch = (request: QueryRequest) => QueryPromise<QueryResponse>;

type JSONText = string;
type JSONData = null | boolean | number | string | JSONData[] | { [key: string]: JSONData };

export type { Safe, ValueOf, TypedOmit, JSONText, JSONData, GlobalThisFetch, NormalizedFetch };
