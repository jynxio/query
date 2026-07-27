import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { scheduleTask } from "../src/_misc/schedule-task.ts";

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("scheduleTask", () => {
    test.each([0, 1, 10])("Uses setTimeout for a %ims task", async (duration) => {
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
        const task = vi.fn();

        scheduleTask(task, duration);

        expect(setTimeoutSpy).toHaveBeenCalledWith(task, duration);
        await vi.advanceTimersByTimeAsync(duration);
        expect(task).toHaveBeenCalledOnce();
    });

    test("Cancels scheduled work", async () => {
        vi.useFakeTimers();
        const task = vi.fn();

        const cancel = scheduleTask(task, 10);
        cancel();
        await vi.advanceTimersByTimeAsync(10);

        expect(task).not.toHaveBeenCalled();
    });
});
