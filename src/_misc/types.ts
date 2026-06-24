type Fetch = typeof fetch;
type FetchArgs = Parameters<Fetch>;
type Awaitable<T> = T | PromiseLike<T>;

type TypedOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] };

type AnyFn = (...args: never[]) => unknown;

type ValueOf<T> = T[keyof T];

export type { ValueOf, TypedOmit, Fetch, FetchArgs, Awaitable, AnyFn };
