function createAbortError() {
    return new DOMException("signal is aborted without reason", "AbortError");
}

function createTimeoutError() {
    return new DOMException("signal timed out", "TimeoutError");
}

export { createAbortError, createTimeoutError };
