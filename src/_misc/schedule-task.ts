const MIN_TIMEOUT = 0;
const MAX_TIMEOUT = 2_147_483_647;

function scheduleTask(task: () => void, timeout: number): () => void {
    if (timeout <= MIN_TIMEOUT) throw new RangeError(`"timeout" must be >= ${MIN_TIMEOUT}`);
    if (timeout >= MAX_TIMEOUT) throw new RangeError(`"timeout" must be <= ${MAX_TIMEOUT}`);

    /**
     *  Via setTimeout
     */
    if (timeout > 10) {
        const handle = setTimeout(task, timeout);
        const cancelTask = () => clearTimeout(handle);

        return cancelTask;
    }

    /**
     * Via AbortSignal
     */
    const handle = AbortSignal.timeout(timeout);
    const cancelTask = () => handle.removeEventListener("abort", task);

    handle.addEventListener("abort", task);

    return cancelTask;
}

export { scheduleTask };
