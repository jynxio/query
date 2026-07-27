import { describe, expect, test } from "vite-plus/test";

import { isRequestOptionsEmpty } from "../src/_misc/is-request-options-empty.ts";

describe("isRequestOptionsEmpty", () => {
    test("Treats inherited and non-enumerable members as non-empty", () => {
        const inherited = Object.create({ method: "POST" }) as RequestInit;
        const nonEnumerable: RequestInit = {};
        Object.defineProperty(nonEnumerable, "headers", {
            value: new Headers({ "X-Test": "yes" }),
            enumerable: false,
        });

        expect(isRequestOptionsEmpty(inherited)).toBe(false);
        expect(isRequestOptionsEmpty(nonEnumerable)).toBe(false);
        expect(isRequestOptionsEmpty({})).toBe(true);
    });
});
