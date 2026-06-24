/**
 * Copy from Ky.
 * @see {@link https://github.com/sindresorhus/ky/blob/61d6d66d27911001b9b4d57ab93139f9ad61384b/source/core/Ky.ts#L78}
 */
function isRequest(i: unknown): i is Request {
    if (typeof globalThis.Request === "function" && i instanceof globalThis.Request) return true;
    if (Object.prototype.toString.call(i) === "[object Request]") return true;

    return false;
}

export { isRequest };
