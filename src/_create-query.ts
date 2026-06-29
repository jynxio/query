import type { FetchArgs, Fetch, TypedOmit, Awaitable } from "./_types.ts";
import type { Validate } from "./_hooks/with-validate.ts";
import type { Config } from "./_config.ts";

import { withRetry } from "./_hooks/with-retry.ts";
import { DEFAULT_CONFIG } from "./_config.ts";
import { withValidate } from "./_hooks/with-validate.ts";
import { normalizeResponse } from "./_utils/normalize-response.ts";

type Query<Res = TypedOmit<Response, "json"> & { json: Validate }> = {
    (...fetchArgs: FetchArgs): Omit<Promise<Res>, "then" | "catch"> & {
        then: <NextRes = Res, Fallback = never>(
            onResolved?: (res: Res) => Awaitable<NextRes>,
            onRejected?: (err: unknown) => Awaitable<Fallback>,
        ) => ReturnType<Query<Awaited<NextRes | Fallback>>>;

        catch: <Fallback = never>(
            onRejected?: (err: unknown) => Awaitable<Fallback>,
        ) => ReturnType<Query<Awaited<Res | Fallback>>>;
    };
};

const query = (() => {
    let inst: Query | undefined = undefined;
    const fn: Query = (...args) => (inst ||= new Query())(...args);

    return fn;
})();

const Query = function (config: Config = {}, fetcher: Fetch = fetch) {
    const fetcherWithRetry = withRetry(fetcher, { ...DEFAULT_CONFIG, ...config });

    return function fetcherWithValidate(...args: FetchArgs) {
        return fetcherWithRetry(...args)
            .then(normalizeResponse)
            .then((res) => {
                const getJSONData = res.json.bind(res);
                const getValidatedJSONData = withValidate(getJSONData);

                return Object.assign(res, { json: getValidatedJSONData });
            });
    } as Query; // TODO: 此类型断言需要健壮的测试
} as unknown as new (config?: Config, fetcher?: Fetch) => Query;

export { Query, query };
