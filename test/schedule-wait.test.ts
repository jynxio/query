import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { scheduleWait } from "../src/_misc/schedule-wait.ts";

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("scheduleWait", () => {
    test("An already-aborted signal returns a rejected promise", async () => {
        const reason = { source: "pre-abort" };

        const promise = scheduleWait(10, AbortSignal.abort(reason));

        expect(promise).toBeInstanceOf(Promise);
        await expect(promise).rejects.toBe(reason);
    });

    test("An in-flight abort preserves its reason and cancels the timer", async () => {
        vi.useFakeTimers();
        const reason = { source: "mid-abort" };
        const controller = new AbortController();

        const promise = scheduleWait(10, controller.signal);
        const assertion = expect(promise).rejects.toBe(reason);
        controller.abort(reason);
        await vi.advanceTimersByTimeAsync(10);

        await assertion;
    });
});
