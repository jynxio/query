import { toError } from "./to-error.ts";

/**
 * TODO: 晚点，迁移到自定义错误去
 */
function callTry<T>(fn: (...args: never[]) => Promise<T>): Promise<[true, T] | [false, Error]>;
function callTry<T>(fn: (...args: never[]) => T): [true, T] | [false, Error];
function callTry<T>(
    fn: (...args: never[]) => T | Promise<T>,
): Promise<[true, T] | [false, Error]> | ([true, T] | [false, Error]) {
    try {
        const result = fn();
        const isPromise = result instanceof Promise;

        // TODO(QueryError): Promise rejections are normalized to plain Error, not QueryError("unknown").
        return isPromise
            ? result
                  .then<[true, T]>((response) => [true, response])
                  .catch<[false, Error]>((unknown) => [false, toError(unknown)])
            : [true, result];
    } catch (unknown) {
        // TODO(QueryError): Synchronous throws are normalized to plain Error, not QueryError("unknown").
        return [false, toError(unknown)];
    }
}

export { callTry };
