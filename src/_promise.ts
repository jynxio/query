import type { TypedOmit } from "./_types.ts";

type QueryPromiseFulfilledResult<T> = { status: "fulfilled"; value: T };
type QueryPromiseRejectedResult = { status: "rejected"; reason: unknown };
type QueryPromiseSettledResult<T> = QueryPromiseFulfilledResult<T> | QueryPromiseRejectedResult;
type QueryPromiseWithResolvers<T> = {
    promise: QueryPromise<T>;
    reject: (reason?: unknown) => void;
    resolve: (value: T | PromiseLike<T>) => void;
};

type QueryPromiseConstructor = TypedOmit<
    typeof Promise,
    "all" | "allSettled" | "any" | "prototype" | "race" | "reject" | "resolve" | "try" | "withResolvers"
> & {
    // prototype
    readonly prototype: QueryPromise<unknown>;

    // new
    new <T>(
        executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void,
    ): QueryPromise<T>;

    // all
    all<T extends readonly unknown[] | []>(
        values: T,
    ): QueryPromise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
    all<T>(values: Iterable<T | PromiseLike<T>>): QueryPromise<Awaited<T>[]>;

    // allSettled
    allSettled<T extends readonly unknown[] | []>(
        values: T,
    ): QueryPromise<{ -readonly [P in keyof T]: QueryPromiseSettledResult<Awaited<T[P]>> }>;
    allSettled<T>(
        values: Iterable<T | PromiseLike<T>>,
    ): QueryPromise<QueryPromiseSettledResult<Awaited<T>>[]>;

    // any
    any<T extends readonly unknown[] | []>(values: T): QueryPromise<Awaited<T[number]>>;
    any<T>(values: Iterable<T | PromiseLike<T>>): QueryPromise<Awaited<T>>;

    // race
    race<T extends readonly unknown[] | []>(values: T): QueryPromise<Awaited<T[number]>>;
    race<T>(values: Iterable<T | PromiseLike<T>>): QueryPromise<Awaited<T>>;

    // reject
    reject<T = never>(reason?: unknown): QueryPromise<T>;

    // resolve
    resolve(): QueryPromise<void>;
    resolve<T>(value: T): QueryPromise<Awaited<T>>;
    resolve<T>(value: T | PromiseLike<T>): QueryPromise<Awaited<T>>;

    // try
    try<T, Args extends unknown[]>(
        callbackFn: (...args: Args) => T | PromiseLike<T>,
        ...args: Args
    ): QueryPromise<Awaited<T>>;

    // withResolvers
    withResolvers<T>(): QueryPromiseWithResolvers<T>;
};

type QueryPromise<T> = TypedOmit<Promise<T>, "then" | "catch" | "finally"> & {
    then<Result = T, Fallback = never>(
        onFulfilled?: ((value: T) => Result | PromiseLike<Result>) | null,
        onRejected?: ((reason: unknown) => Fallback | PromiseLike<Fallback>) | null,
    ): QueryPromise<Result | Fallback>;

    catch<Fallback = never>(
        onRejected?: ((reason: unknown) => Fallback | PromiseLike<Fallback>) | null,
    ): QueryPromise<T | Fallback>;

    finally(onFinally?: (() => void) | null): QueryPromise<T>;
};

const QueryPromise: QueryPromiseConstructor = Promise;

export { QueryPromise };
