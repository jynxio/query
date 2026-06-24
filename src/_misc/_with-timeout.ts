import { QueryError } from "../_query-error.ts";
import { createTimer } from "./_create-timer.ts";

function withFallback<A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R | undefined>;
function withFallback<A extends unknown[], R, F>(
    fn: (...args: A) => Promise<R>,
    fallback: F,
): (...args: A) => Promise<R | F>;

function withFallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R | undefined;
function withFallback<A extends unknown[], R, F>(fn: (...args: A) => R, fallback: F): (...args: A) => R | F;

function withFallback<A extends unknown[], R, F>(
    fn: (...args: A) => Promise<R> | R,
    fallback?: F,
): (...args: A) => Promise<R | F | undefined> | (R | F | undefined) {
    return function (...args: A): Promise<R | F | undefined> | (R | F | undefined) {
        try {
            const res = fn(...args);
            const isPromise = res instanceof Promise;

            return isPromise ? res.catch(() => fallback) : res;
        } catch {
            return fallback;
        }
    };
}

function withDeadline<A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    deadline: number,
): (...args: A) => Promise<R> {
    const DEADLINE_SYM = Symbol();

    const ref = Promise.withResolvers<typeof DEADLINE_SYM>();
    const timer = createTimer(() => ref.resolve(DEADLINE_SYM), deadline);

    return async function (...args: A): Promise<R> {
        timer.start();

        const userPromise = fn(...args);
        const deadlinePromise = ref.promise;
        const result = await Promise.race([userPromise, deadlinePromise]);

        if (result === DEADLINE_SYM) throw new QueryError({ type: "timeout" });

        return result;
    };
}

export { withDeadline, withFallback };
