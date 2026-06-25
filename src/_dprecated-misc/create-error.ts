/**
 * TODO: 晚一点，我自己要考虑整合进自定义的错误系统里去
 */

function createTimeoutErr() {
    // TODO(QueryError): Decide whether timeout reasons stay DOMException internally and become QueryError("timeout") at Query boundary.
    return new DOMException("signal timed out", "TimeoutError");
}

function createAbortError(reason: string = "signal is aborted without reason") {
    // TODO(QueryError): Decide whether abort reasons stay DOMException internally and become QueryError("abortion") at Query boundary.
    return new DOMException(reason, "AbortError");
}

export { createTimeoutErr, createAbortError };
