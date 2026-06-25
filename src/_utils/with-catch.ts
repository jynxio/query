import { toError } from "./to-error.ts";

function withCatch<Args extends unknown[], Result, Fallback>(
    tryFn: (...args: Args) => Promise<Result>,
    catchFn: (error: Error) => Fallback,
): (...args: Args) => Promise<Result | Fallback>;

function withCatch<Args extends unknown[], Result, Fallback>(
    tryFn: (...args: Args) => Result,
    catchFn: (error: Error) => Fallback,
): (...args: Args) => Result | Fallback;

function withCatch<Args extends unknown[], Result, Fallback>(
    tryFn: (...args: Args) => Promise<Result> | Result,
    catchFn: (error: Error) => Fallback,
): (...args: Args) => Promise<Result | Fallback> | (Result | Fallback) {
    return function (...args: Args): Promise<Result | Fallback> | (Result | Fallback) {
        try {
            const result = tryFn(...args);
            const isPromise = result instanceof Promise;

            if (!isPromise) return result;

            return result.catch((unknown: unknown) => catchFn(toError(unknown)));
        } catch (unknown) {
            return catchFn(toError(unknown));
        }
    };
}

export { withCatch };
