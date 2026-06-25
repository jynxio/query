import { QueryError } from "../_query-error.ts";
import { scheduleTask } from "./schedule-task.ts";

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

export { withTimeout };
