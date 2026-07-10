import { QueryError } from "../_error.ts";
import { scheduleTask } from "./schedule-task.ts";

function sleep(duration: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) return Promise.reject(new QueryError("abort"));

    const handle = Promise.withResolvers<void>();
    const cancelResolve = scheduleTask(resolve, duration);

    signal?.addEventListener("abort", reject, { once: true });

    return handle.promise;

    function reject() {
        cancelResolve();
        handle.reject(new QueryError("abort"));
    }

    function resolve() {
        handle.resolve();
        signal?.removeEventListener("abort", reject);
    }
}

export { sleep };
