import type { NormalizedFetch } from "../_types.ts";

function withHTTP(fn: NormalizedFetch): NormalizedFetch {
    return async function (request) {
        const response = await fn(request);

        if (response.ok) return response;
        if (response.type === "opaque") return response;

        throw response;
    };
}

export { withHTTP };
