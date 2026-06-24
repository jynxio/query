/**
 * TODO: 考虑使用自定义的错误类型
 */
function isError(i: unknown): i is Error {
    return i instanceof Error;
}

export { isError };
