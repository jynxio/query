import { toError } from "./to-error.ts";

function withTry<Args extends unknown[], Result>(
    fn: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result | Error>;

function withTry<Args extends unknown[], Result>(
    fn: (...args: Args) => Result,
): (...args: Args) => Result | Error;

function withTry<Args extends unknown[], Result>(
    fn: (...args: Args) => Result | Promise<Result>,
): (...args: Args) => Result | Error | Promise<Result | Error> {
    return (...args: Args) => {
        try {
            const res = fn(...args);
            const isPromise = res instanceof Promise;

            // TODO(QueryError): Promise rejections are normalized to plain Error, not QueryError("unknown").
            return isPromise ? res.catch<Error>(toError) : res;
        } catch (raw) {
            // TODO(QueryError): Synchronous throws are normalized to plain Error, not QueryError("unknown").
            return toError(raw);
        }
    };
}

export { withTry };
