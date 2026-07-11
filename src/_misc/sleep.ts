import { scheduleTask } from "./schedule-task.ts";

function sleep(duration: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw signal.reason;

    const ctrl = Promise.withResolvers<void>();
    const cancelResolve = scheduleTask(resolve, duration);

    signal?.addEventListener("abort", reject, { once: true });

    return ctrl.promise;

    function reject() {
        cancelResolve();
        ctrl.reject(signal?.reason);
    }

    function resolve() {
        ctrl.resolve();
        signal?.removeEventListener("abort", reject);
    }
}

export { sleep };
