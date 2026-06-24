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

export { withFallback };
