import { QueryError } from "../_query-error.ts";

const MIN_TIMEOUT = 0;
const MAX_TIMEOUT = 2_147_483_647;

function withTimeout<A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    timeout: number,
): (...args: A) => Promise<R> {
    const handle = Promise.withResolvers<never>();

    return function (...args: A): Promise<R> {
        const cancel = scheduleTask(() => handle.reject(new QueryError({ type: "timeout" })), timeout);
        const result = Promise.race([fn(...args), handle.promise]);

        return result.finally(() => cancel());
    };
}

function scheduleTask(task: () => void, timeout: number): () => void {
    if (timeout <= MIN_TIMEOUT) throw new RangeError(`"timeout" must be >= ${MIN_TIMEOUT}`);
    if (timeout >= MAX_TIMEOUT) throw new RangeError(`"timeout" must be <= ${MAX_TIMEOUT}`);

    // Via setTimeout
    if (timeout > 10) {
        const handle = setTimeout(task, timeout);
        const cancelTask = () => clearTimeout(handle);

        return cancelTask;
    }

    // Via AbortSignal
    const handle = AbortSignal.timeout(timeout);
    const cancelTask = () => handle.removeEventListener("abort", task);

    handle.addEventListener("abort", task);

    return cancelTask;
}

export { withTimeout };
