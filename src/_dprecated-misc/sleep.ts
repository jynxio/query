/**
 * TODO: 考虑一下 sleep 和 wait 二选一
 */
async function sleep(ms: number, signal?: AbortSignal): Promise<undefined> {
    if (ms <= 0) return;
    if (signal?.aborted) return;

    const { promise, resolve } = Promise.withResolvers<undefined>();
    const timer = setTimeout(done, ms);

    return (signal?.addEventListener("abort", done), promise);

    function done() {
        resolve(undefined);
        clearTimeout(timer);
        signal?.removeEventListener("abort", done);
    }
}

export { sleep };
