/**
 * Copied from the Fetch Standard.
 * @see {@link https://fetch.spec.whatwg.org/#requestinit}
 */
const REQUEST_INIT_MEMBERS = [
    "method",
    "headers",
    "body",
    "referrer",
    "referrerPolicy",
    "mode",
    "credentials",
    "cache",
    "redirect",
    "integrity",
    "keepalive",
    "signal",
    "duplex",
    "priority",
    "window",
];

function isRequestInitEmpty(i: ConstructorParameters<typeof Request>[1]): boolean {
    /**
     * Copied from Chromium.
     * @see {@link https://github.com/chromium/chromium/blob/3bb740088c53ad4946b95596d1b1894da0656ed7/third_party/blink/renderer/core/fetch/request.cc#L214-L222}
     */
    if (i === null) return true;
    if (i === undefined) return true;

    return REQUEST_INIT_MEMBERS.every((item) => Reflect.get(i, item) === undefined);
}

/**
 * Copied from Ky.
 *
 * @see {@link https://github.com/sindresorhus/ky/blob/61d6d66d27911001b9b4d57ab93139f9ad61384b/source/core/Ky.ts#L78}
 */
function isRequest(i: unknown): i is Request {
    if (typeof globalThis.Request === "function" && i instanceof globalThis.Request) return true;
    if (Object.prototype.toString.call(i) === "[object Request]") return true;

    return false;
}

export { isRequest, isRequestInitEmpty };
