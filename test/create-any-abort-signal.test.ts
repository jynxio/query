import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";

import { createAnyAbortSignal } from "../src/_misc/create-any-abort-signal.ts";

/**
 * Copied from WPT.
 *
 * @see {@link https://github.com/web-platform-tests/wpt/blob/master/dom/abort/resources/abort-signal-any-tests.js}
 */
describe("createAnyAbortSignal", () => {
    const nativeAnyDescriptor = Object.getOwnPropertyDescriptor(AbortSignal, "any");

    beforeAll(() => {
        Object.defineProperty(AbortSignal, "any", { configurable: true, value: undefined });
    });

    afterAll(() => {
        if (nativeAnyDescriptor) {
            Object.defineProperty(AbortSignal, "any", nativeAnyDescriptor);
        } else {
            Reflect.deleteProperty(AbortSignal, "any");
        }
    });

    test("Works with an empty array of signals", () => {
        expect(createAnyAbortSignal([]).aborted).toBe(false);
    });

    test("Follows a single signal", () => {
        const controller = new AbortController();
        const source = controller.signal;
        const combined = createAnyAbortSignal([source]);
        let eventTarget: EventTarget | null = null;

        combined.onabort = (event) => {
            eventTarget = event.target;
        };

        expect(combined).not.toBe(source);
        expect(combined.aborted).toBe(false);
        expect(combined.reason).toBeUndefined();

        controller.abort("reason string");

        expect(source.aborted).toBe(true);
        expect(combined.aborted).toBe(true);
        expect(eventTarget).toBe(combined);
        expect(combined.reason).toBe("reason string");
    });

    test.each([0, 1, 2])("Follows signal %i out of multiple signals", (abortedIndex) => {
        const controllers = Array.from({ length: 3 }, () => new AbortController());
        const combined = createAnyAbortSignal(controllers.map(({ signal }) => signal));
        let eventTarget: EventTarget | null = null;

        combined.onabort = (event) => {
            eventTarget = event.target;
        };
        controllers[abortedIndex]!.abort();

        expect(eventTarget).toBe(combined);
        expect(combined.aborted).toBe(true);
        expect(combined.reason).toBeInstanceOf(DOMException);
        expect(combined.reason).toMatchObject({ name: "AbortError" });
    });

    test("Uses the first already-aborted signal", () => {
        const controllers = Array.from({ length: 3 }, () => new AbortController());
        controllers[1]!.abort("reason 1");
        controllers[2]!.abort("reason 2");

        const combined = createAnyAbortSignal(controllers.map(({ signal }) => signal));

        expect(combined.aborted).toBe(true);
        expect(combined.reason).toBe("reason 1");
    });

    test("Can receive the same signal more than once", () => {
        const controller = new AbortController();
        const combined = createAnyAbortSignal([controller.signal, controller.signal]);

        controller.abort("reason");

        expect(combined.aborted).toBe(true);
        expect(combined.reason).toBe("reason");
    });

    test("Uses the first instance of an already-aborted duplicate signal", () => {
        const controller1 = new AbortController();
        const controller2 = new AbortController();
        controller1.abort("reason 1");
        controller2.abort("reason 2");

        const combined = createAnyAbortSignal([controller1.signal, controller2.signal, controller1.signal]);

        expect(combined.aborted).toBe(true);
        expect(combined.reason).toBe("reason 1");
    });

    test.each([0, 1, 2])("Composes signals when source %i aborts", (abortedIndex) => {
        const controllers = Array.from({ length: 3 }, () => new AbortController());
        const intermediate = createAnyAbortSignal([controllers[0]!.signal, controllers[1]!.signal]);
        const combined = createAnyAbortSignal([intermediate, controllers[2]!.signal]);

        controllers[abortedIndex]!.abort();

        expect(combined.aborted).toBe(true);
        expect(combined.reason).toBeInstanceOf(DOMException);
        expect(combined.reason).toMatchObject({ name: "AbortError" });
    });

    test("Works with a signal returned by AbortSignal.timeout()", async () => {
        const controller = new AbortController();
        const combined = createAnyAbortSignal([controller.signal, AbortSignal.timeout(5)]);

        await new Promise<void>((resolve) => {
            combined.addEventListener("abort", () => resolve(), { once: true });
        });

        expect(combined.aborted).toBe(true);
        expect(combined.reason).toBeInstanceOf(DOMException);
        expect(combined.reason).toMatchObject({ name: "TimeoutError" });
    });

    test("Works through multiple intermediate signals", () => {
        const controller = new AbortController();
        let combined = createAnyAbortSignal([controller.signal]);
        combined = createAnyAbortSignal([combined]);
        combined = createAnyAbortSignal([combined]);
        combined = createAnyAbortSignal([combined]);
        let eventFired = false;

        combined.onabort = () => {
            eventFired = true;
        };
        controller.abort("the reason");

        expect(eventFired).toBe(true);
        expect(combined.aborted).toBe(true);
        expect(combined.reason).toBe("the reason");
    });

    /**
     * Expected to fail.
     * Relies on an internal API unavailable to polyfills.
     */
    test.fails("Fires abort events in dependent-signal order", () => {
        const controller = new AbortController();
        const signals = [
            controller.signal,
            createAnyAbortSignal([controller.signal]),
            createAnyAbortSignal([controller.signal]),
            createAnyAbortSignal([controller.signal]),
        ];
        signals.push(createAnyAbortSignal([signals[1]!]));
        let order = "";

        for (const [index, signal] of signals.entries()) {
            signal.addEventListener("abort", () => {
                order += index;
            });
        }
        controller.abort();

        expect(order).toBe("01234");
    });

    test("Marks dependent signals aborted before firing abort events", () => {
        const controller = new AbortController();
        const signal1 = createAnyAbortSignal([controller.signal]);
        const signal2 = createAnyAbortSignal([signal1]);
        let eventFired = false;

        controller.signal.addEventListener("abort", () => {
            const signal3 = createAnyAbortSignal([signal2]);

            expect(controller.signal.aborted).toBe(true);
            expect(signal1.aborted).toBe(true);
            expect(signal2.aborted).toBe(true);
            expect(signal3.aborted).toBe(true);
            eventFired = true;
        });
        controller.abort();

        expect(eventFired).toBe(true);
    });

    /**
     * Expected to fail.
     * Relies on an internal API unavailable to polyfills.
     */
    test.fails("Marks dependents aborted before a pre-existing source abort listener runs", () => {
        const controller = new AbortController();
        let signal1: AbortSignal;
        let signal2: AbortSignal;
        let statesDuringSourceEvent: boolean[] = [];

        controller.signal.addEventListener("abort", () => {
            statesDuringSourceEvent = [signal1.aborted, signal2.aborted];
        });
        signal1 = createAnyAbortSignal([controller.signal]);
        signal2 = createAnyAbortSignal([signal1]);
        controller.abort();

        expect(statesDuringSourceEvent).toEqual([true, true]);
    });

    test("Handles reentrant aborts without changing the first reason", () => {
        const controller1 = new AbortController();
        const controller2 = new AbortController();
        const combined = createAnyAbortSignal([controller1.signal, controller2.signal]);
        let eventCount = 0;

        controller1.signal.addEventListener("abort", () => {
            controller2.abort("reason 2");
        });
        combined.addEventListener("abort", () => {
            eventCount++;
        });
        controller1.abort("reason 1");

        expect(eventCount).toBe(1);
        expect(combined.aborted).toBe(true);
        expect(combined.reason).toBe("reason 1");
    });

    test("Preserves the reason instance from an already-aborted source", () => {
        const source = AbortSignal.abort();
        const combined = createAnyAbortSignal([source]);

        expect(source.reason).toBeInstanceOf(DOMException);
        expect(combined.reason).toBe(source.reason);
    });

    test("Preserves the reason instance from a source aborted later", () => {
        const controller = new AbortController();
        const combined = createAnyAbortSignal([controller.signal]);
        controller.abort();

        expect(controller.signal.reason).toBeInstanceOf(DOMException);
        expect(combined.reason).toBe(controller.signal.reason);
    });
});
