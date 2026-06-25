import type { ValueOf } from "./types.ts";

type EndReason = ValueOf<typeof END_REASON>;

const END_REASON = {
    ELAPSED: "elapsed", // Completed after the configured duration
    ABORTED: "aborted", // Ended early by an external abort
} as const;

export { END_REASON };
export type { EndReason };
