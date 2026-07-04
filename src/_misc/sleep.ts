import { QueryError } from "../_error.ts";
import { scheduleTask } from "./schedule-task.ts";

function sleep(duration: number, signal?: AbortSignal): Promise<void> {
    const handle = Promise.withResolvers<void>();
    const cancelResolve = scheduleTask(resolve, duration);

    signal?.addEventListener("abort", reject, { once: true });

    return handle.promise;

    function reject() {
        cancelResolve();
        handle.reject(new QueryError("abortion"));
    }

    function resolve() {
        handle.resolve();
        signal?.removeEventListener("abort", reject);
    }
}

export { sleep };
