/**
 * TODO: 晚点，我自己迁移到 call-try 去
 */
function safe<R>(fn: (...args: never[]) => Promise<R>): Promise<R | undefined>;
function safe<R, F>(fn: (...args: never[]) => Promise<R>, fallback?: F): Promise<R | F>;

function safe<R>(fn: (...args: never[]) => R): R | undefined;
function safe<R, F>(fn: (...args: never[]) => R, fallback?: F): R | F;

function safe<R, F>(
    fn: (...args: never[]) => R | Promise<R>,
    fallback?: F,
): Promise<R | F | undefined> | (R | F | undefined) {
    try {
        const res = fn();
        const isPromise = res instanceof Promise;

        // TODO(QueryError): This helper swallows async errors into fallback; audit every caller before enforcing QueryError.
        return isPromise ? res.catch(() => fallback) : res;
    } catch {
        // TODO(QueryError): This helper swallows sync errors into fallback; audit every caller before enforcing QueryError.
        return fallback;
    }
}

export { safe };
