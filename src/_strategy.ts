type RetryStrategy = {
    jitter: boolean;
    retryCount: number;
    backoffLimit: number;
    totalTimeout: number;
    methods: readonly string[];
    status: readonly number[];
    retryDelay: number | ((retryCount: number) => number);
};

const defaultRetryStrategy = {
    jitter: false,
    retryCount: 1,
    backoffLimit: 30_000,
    totalTimeout: Infinity,
    methods: ["GET", "HEAD"],
    status: [408, 429, 500, 502, 503, 504],
    retryDelay: (retryCount) => 300 * 2 ** (retryCount - 1),
} satisfies Required<RetryStrategy>;

export { defaultRetryStrategy };
export type { RetryStrategy };
