/**
 * Copied from the Fetch Standard.
 *
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

function isRequestOptionsEmpty(options: ConstructorParameters<typeof Request>[1]): boolean {
    /**
     * Copied from Chromium.
     *
     * @see {@link https://github.com/chromium/chromium/blob/3bb740088c53ad4946b95596d1b1894da0656ed7/third_party/blink/renderer/core/fetch/request.cc#L214-L222}
     */
    if (options === null) return true;
    if (options === undefined) return true;

    return REQUEST_INIT_MEMBERS.every((item) => Reflect.get(options, item) === undefined);
}

export { isRequestOptionsEmpty };
