function createTimeoutError() {
    return new DOMException("signal timed out", "TimeoutError");
}

export { createTimeoutError };
