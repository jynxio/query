const MIN_TIMEOUT = 0;
const MAX_TIMEOUT = 2_147_483_647;

function schedule(task: () => void, timeout: number): () => void {
    if (timeout < MIN_TIMEOUT) throw new RangeError(`"timeout" must be >= ${MIN_TIMEOUT}`);
    if (timeout > MAX_TIMEOUT) throw new RangeError(`"timeout" must be <= ${MAX_TIMEOUT}`);

    const handle = setTimeout(task, timeout);
    const cancelTask = () => clearTimeout(handle);

    return cancelTask;
}

async function sleep(duration: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw signal.reason;

    const ctrl = Promise.withResolvers<void>();
    const cancelResolve = schedule(resolve, duration);

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

export { schedule, sleep };
