import { END_REASON } from "./_consts.ts";

import type { EndReason } from "./_consts.ts";

async function wait(ms: number): Promise<typeof END_REASON.ELAPSED>;
async function wait(ms: number, signal: AbortSignal): Promise<EndReason>;
async function wait(ms: number, signal?: AbortSignal): Promise<EndReason> {
    if (ms <= 0) return END_REASON.ELAPSED;
    if (signal?.aborted) return END_REASON.ABORTED;

    const { promise, resolve } = Promise.withResolvers<EndReason>();
    const timerID = setTimeout(elapse, ms);

    return (signal?.addEventListener("abort", abort), promise);

    function abort() {
        clearTimeout(timerID);
        resolve(END_REASON.ABORTED);
        signal?.removeEventListener("abort", abort);
    }

    function elapse() {
        clearTimeout(timerID);
        resolve(END_REASON.ELAPSED);
        signal?.removeEventListener("abort", abort);
    }
}

export { wait };
