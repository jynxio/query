import type { QueryPromise } from "./_promise.ts";
import type { QueryRequest } from "./_request.ts";
import type { QueryResponse } from "./_response.ts";

type Safe<T, E> = { ok: false; error: E } | { ok: true; data: T };
type TypedOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] };

type GlobalThisFetch = (typeof globalThis)["fetch"];
type NormalizedFetch = (request: QueryRequest) => QueryPromise<QueryResponse>;

type JSONData = null | boolean | number | string | JSONData[] | { [key: string]: JSONData };

export type { Safe, TypedOmit, JSONData, GlobalThisFetch, NormalizedFetch };
