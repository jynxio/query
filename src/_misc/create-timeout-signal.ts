import { createTimeoutErr } from "./create-error.ts";

/** @see {@link https://github.com/sindresorhus/ky/issues/117} */
const MAX_TIMER_TIMEOUT = 2_147_483_647;
const LONG_WAIT_THRESHOLD = 10;
const IMMORTAL_SIGNAL = new AbortController().signal;

/**
 * TODO:
 * 和 AbortSignal.timeout 一模一样，但额外提供一个 cancel 方法，方便主动结束，并且也内存安全
 * 另外，有一点点区别是，最大的 deadline 是 2_147_483_647（这是因为受限于 settimeout），并且
 * 额外的支持 Infinity，意味着永不结束
 */
function createTimeoutSignal(ms: number): [AbortSignal, cancel: () => void] {
    /**
     * Signal
     */
    if (ms < LONG_WAIT_THRESHOLD) return withCancel(AbortSignal.timeout(ms));

    /**
     * Timer
     */
    if (ms === Infinity) return [IMMORTAL_SIGNAL, () => {}];
    // TODO(QueryError): Invalid timeout config currently throws RangeError, not QueryError("unknown") or QueryError("timeout").
    if (ms > MAX_TIMER_TIMEOUT) throw new RangeError("`timeout` must be <= " + MAX_TIMER_TIMEOUT);

    let isEnabled = true;

    const ctrl = new AbortController();
    const timerID = setTimeout(() => isEnabled && abort(), ms);

    return [ctrl.signal, cancel];

    function abort() {
        // TODO(QueryError): Timeout signal reason is a DOMException; public Query errors should become QueryError("timeout").
        if (isEnabled) ctrl.abort(createTimeoutErr());
    }

    function cancel() {
        isEnabled = false;
        clearTimeout(timerID);
    }
}

function withCancel(i: AbortSignal): [AbortSignal, cancel: () => void] {
    if (i.aborted) return [i, () => {}];

    let isRunning = true;
    const forwardCTRL = new AbortController();
    const cancelSignal = () => void (isRunning = false);
    const abortSignal = () => void (isRunning && forwardCTRL.abort(i.reason));

    i.addEventListener("abort", abortSignal, { once: true });

    return [forwardCTRL.signal, cancelSignal];
}

export { createTimeoutSignal };
