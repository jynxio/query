function createAnyAbortSignal(...[signals]: Parameters<(typeof AbortSignal)["any"]>): AbortSignal {
    if (AbortSignal.any) return AbortSignal.any(signals);

    const abortedSignal = signals.find((item) => item.aborted);
    if (abortedSignal) return AbortSignal.abort(abortedSignal.reason);

    const ctrl = new AbortController();
    const opts = { once: true, signal: ctrl.signal };

    for (const item of signals) item.addEventListener("abort", () => ctrl.abort(item.reason), opts);

    return ctrl.signal;
}

export { createAnyAbortSignal };
