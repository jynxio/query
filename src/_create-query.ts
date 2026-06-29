import type { FetchArgs, Awaitable, TypedOmit } from "./_types.ts";

import { withRetry } from "./_hooks/with-retry.ts";
import { defaultRetryStrategy } from "./_deprecated-strategy.ts";
import { withValidate } from "./_hooks/with-validate.ts";

type ValidatedResponse = TypedOmit<Response, "json"> & { json: ReturnType<typeof withValidate> };
type Query<Res> = {
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

function createQuery(props?: QueryStrategy): Query<ValidatedResponse> {
    const userRetryStrategy = props?.retry ?? {};
    const resolvedRetryStrategy = { ...defaultRetryStrategy, ...userRetryStrategy };
    const fetchWithRetry = withRetry(globalThis.fetch, resolvedRetryStrategy);

    return function (...args: FetchArgs) {
        // TODO(QueryError): Normalize every rejection from fetchWithRetry into QueryError at the public Query boundary.
        return fetchWithRetry(...args).then((res) => {
            const getJSONData = res.json.bind(res);
            const getValidatedJSONData = withValidate(getJSONData);

            return Object.assign(res, { json: getValidatedJSONData });
        });
    } as Query<ValidatedResponse>; // TODO: 此类型断言需要健壮的测试
}

export { createQuery };
