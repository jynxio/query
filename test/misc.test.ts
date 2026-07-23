import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { isRequestInitEmpty } from "../src/_misc/guards.ts";
import { schedule, sleep } from "../src/_misc/schedule.ts";

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("schedule", () => {
    test.each([0, 1, 10])("Uses setTimeout for a %ims task", async (duration) => {
        vi.useFakeTimers();
        const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
        const task = vi.fn();

        schedule(task, duration);

        expect(setTimeoutSpy).toHaveBeenCalledWith(task, duration);
        await vi.advanceTimersByTimeAsync(duration);
        expect(task).toHaveBeenCalledOnce();
    });

    test("Cancels scheduled work", async () => {
        vi.useFakeTimers();
        const task = vi.fn();

        const cancel = schedule(task, 10);
        cancel();
        await vi.advanceTimersByTimeAsync(10);

        expect(task).not.toHaveBeenCalled();
    });
});

describe("sleep", () => {
    test("An already-aborted signal returns a rejected promise", async () => {
        const reason = { source: "pre-abort" };

        const promise = sleep(10, AbortSignal.abort(reason));

        expect(promise).toBeInstanceOf(Promise);
        await expect(promise).rejects.toBe(reason);
    });

    test("An in-flight abort preserves its reason and cancels the timer", async () => {
        vi.useFakeTimers();
        const reason = { source: "mid-abort" };
        const controller = new AbortController();

        const promise = sleep(10, controller.signal);
        const assertion = expect(promise).rejects.toBe(reason);
        controller.abort(reason);
        await vi.advanceTimersByTimeAsync(10);

        await assertion;
    });
});

describe("RequestInit detection", () => {
    test("Treats inherited and non-enumerable members as non-empty", () => {
        const inherited = Object.create({ method: "POST" }) as RequestInit;
        const nonEnumerable: RequestInit = {};
        Object.defineProperty(nonEnumerable, "headers", {
            value: new Headers({ "X-Test": "yes" }),
            enumerable: false,
        });

        expect(isRequestInitEmpty(inherited)).toBe(false);
        expect(isRequestInitEmpty(nonEnumerable)).toBe(false);
        expect(isRequestInitEmpty({})).toBe(true);
    });
});
