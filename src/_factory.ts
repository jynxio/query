import type { FetcherArgs, Fetcher } from "./_utils/types.ts";
import type { QueryInst, QueryOpts } from "./_types.ts";

import { withRetry } from "./_hooks/with-retry.ts";
import { DEFAULT_OPTS } from "./_opts.ts";
import { withValidate } from "./_hooks/with-json.ts";
import { normalizeResponse } from "./_utils/normalize-response.ts";

const query = (() => {
    let inst: QueryInst | undefined = undefined;
    const fn: QueryInst = (...args) => (inst ||= createQuery())(...args);

    return fn;
})();

function createQuery(opts: QueryOpts = {}, fetcher: Fetcher = globalThis.fetch) {
    //// 先包 validate 再包 retry
    const fetcherWithRetry = withRetry(fetcher, { ...DEFAULT_OPTS, ...opts });

    return function fetcherWithValidate(...args: FetcherArgs) {
        return fetcherWithRetry(...args)
            .then(normalizeResponse)
            .then((res) => {
                const getJSONData = res.json.bind(res);
                const getValidatedJSONData = withValidate(getJSONData);

                return Object.assign(res, { json: getValidatedJSONData });
            });
    } as QueryInst; // TODO: 此类型断言需要健壮的测试
}

export { createQuery, query };
