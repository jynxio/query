import { END_REASON } from "./_consts.ts";

type ElapsedEnd<T> = [typeof END_REASON.ELAPSED, T];
type AbortedEnd<T> = [];

async function timeOut<T>(task: Promise<T>, ms: number): Promise<[Is]> {}

async function timeOut<T>(task: Promise<T>, ms: number): Promise<T | undefined>;
async function timeOut<T, F>(task: Promise<T>, ms: number, fallback: F): Promise<T | F>;
async function timeOut<T, F>(task: Promise<T>, ms: number, fallback?: F): Promise<T | F | undefined> {
    const tag = Symbol();
    const timer = Promise.withResolvers<typeof tag>();
    const timerId = setTimeout(() => timer.resolve(tag), ms);
    // TODO(QueryError): If task rejects before timeout, that raw rejection escapes instead of QueryError.
    const res = await Promise.race([task, timer.promise]);

    clearTimeout(timerId);

    // TODO(QueryError): Timeout is represented as fallback/undefined here, not QueryError("timeout").
    return res === tag ? fallback : res;
}

export { timeOut };
