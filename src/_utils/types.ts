type Fetcher = (typeof globalThis)["fetch"];
type FetcherArgs = Parameters<Fetcher>;

type ValueOf<T> = T[keyof T];
type Awaitable<T> = T | PromiseLike<T>;
type TypedOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] };

type TypedJSON = null | boolean | number | string | TypedJSON[] | { [key: string]: TypedJSON };

// type ResponseWithTypedJSONParser = TypedOmit<Response, "json"> & { json: () => Promise<TypedJSON> };

export type { ValueOf, TypedOmit, Fetcher, FetcherArgs, Awaitable, TypedJSON };
