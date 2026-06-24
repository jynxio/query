// Accepted custom responses are treated as full Responses throughout Ky.
// If a custom fetch returns one, it must behave like a Response for cloning,
// body consumption, `json()` decoration, and any enabled stream features.
/**
 * Copy from Ky.
 * @see {@link https://github.com/sindresorhus/ky/blob/61d6d66d27911001b9b4d57ab93139f9ad61384b/source/core/Ky.ts#L84}
 */
function isResponse(i: unknown): i is Response {
    if (typeof globalThis.Response === "function" && i instanceof globalThis.Response) return true;
    if (Object.prototype.toString.call(i) === "[object Response]") return true;

    return false;
}

export { isResponse };
