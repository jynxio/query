import type { FetchArgs, Awaitable, TypedOmit } from "./_misc/types.ts";
import type { RetryStrategy } from "./_strategy.ts";

import { withRetry } from "./_with-retry.ts";
import { withJSON } from "./_with-json.ts";
import { defaultRetryStrategy } from "./_strategy.ts";

type ValidatedResponse = TypedOmit<Response, "json"> & { json: ReturnType<typeof withJSON> };
type QueryStrategy = { retry?: Partial<RetryStrategy> };
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
            const oldMethod = res.json.bind(res);
            const newMethod = withJSON(oldMethod);

            return Object.assign(res, { json: newMethod });
        });
    } as Query<ValidatedResponse>; // TODO: 此类型断言需要健壮的测试
}

export { createQuery };
