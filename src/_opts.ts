import type { SchematicRes } from "./_types.ts";
import type { QueryError } from "./_error.ts";

import { isError } from "./_misc/guards.ts";

type Opts = {
    /** 单次尝试的时间上限 */
    attemptTimeout: number;
    /** 总的时间上限 */
    overallTimeout: number;
    /** 设置下一次重试 */
    retry: (prevAttempt: {
        /** 上一次尝试的编号，从 1 开始 */
        readonly no: number;
        /** 上一次尝试的输入 */
        readonly input: Request;
        /** 上一次尝试的输出 */
        readonly output: SchematicRes | QueryError;
    }) => Readonly<[should: false] | [should: true, delay: number]>;
};

const RETRY_COUNT = 2;
const RETRY_STATUS = new Set([408, 413, 429, 500, 502, 503, 504]);
const RETRY_METHOD = new Set(["get", "put", "head", "delete", "options", "trace"]);
const OPTS = { retry, attemptTimeout: 10_000, overallTimeout: Number.POSITIVE_INFINITY } satisfies Opts;

/**
 * 默认的重试策略。
 * - 最大重试次数: 2
 * - 允许重试的 Status: 408, 413, 429, 500, 502, 503, 504
 * - 允许重试的 Method: GET, PUT, HEAD, DELETE, OPTIONS, TRACE
 * - 下一次重试的延迟：优先遵循响应头的 Retry-After 字段，如果没有，就使用退避算法（300ms -> 600ms，没有 Jitter 与 Backoff Limit）
 */
function retry(prevAttempt: {
    readonly no: number;
    readonly input: Request;
    readonly output: Error | SchematicRes;
}): Readonly<[should: false] | [should: true, delay: number]> {
    const attemptCountSoFar = prevAttempt.no;
    if (attemptCountSoFar > RETRY_COUNT) return [false];

    const isMetMethod = RETRY_METHOD.has(prevAttempt.input.method.toLowerCase());
    if (!isMetMethod) return [false];

    const localDelay = 300 * 2 ** (attemptCountSoFar - 1);
    if (isError(prevAttempt.output)) return [true, localDelay];

    const isMetStatus = RETRY_STATUS.has(prevAttempt.output.status);
    if (!isMetStatus) return [false];

    const remoteDelay = parseRetryAfterField(prevAttempt.output);
    if (remoteDelay === undefined) return [true, localDelay];

    return [true, remoteDelay];
}

function parseRetryAfterField(res: Response): number | undefined {
    const field = res.headers.get("Retry-After");
    if (!field) return;

    const seconds = Number(field);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

    const date = Date.parse(field);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
}

export { OPTS as QUERY_OPTS };
export type { Opts as QueryOpts };
