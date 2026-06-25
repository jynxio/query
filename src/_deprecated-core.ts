import type { FetchArgs, Awaitable } from "./_dprecated-misc/types.ts";

type YakOnResolved<Res> = Parameters<Yak<Res>["pipe"]>[0];
type YakOnRejected<Res> = Parameters<Yak<Res>["pipe"]>[1];
type Yak<Res> = {
    (...fetchArgs: FetchArgs): Omit<Promise<Res>, "then" | "catch"> & {
        then: <NextRes = Res, Fallback = never>(
            onResolved?: (res: Res) => Awaitable<NextRes>,
            onRejected?: (err: unknown) => Awaitable<Fallback>,
        ) => ReturnType<Yak<Awaited<NextRes | Fallback>>>;

        catch: <Fallback = never>(
            onRejected?: (err: unknown) => Awaitable<Fallback>,
        ) => ReturnType<Yak<Awaited<Res | Fallback>>>;
    };

    pipe: <NextRes = Res, Fallback = never>(
        onResolved?: (res: Res) => Awaitable<NextRes>,
        onRejected?: (err: unknown) => Awaitable<Fallback>,
    ) => Yak<Awaited<NextRes | Fallback>>;
};

type CreateYakProps = Record<"onResolved" | "onRejected", (...args: unknown[]) => unknown>[];

function createYak<Res = Response>(props: CreateYakProps = []): Yak<Res> {
    return Object.assign(run, { pipe });

    function run(...fetchArgs: FetchArgs): ReturnType<Yak<Res>> {
        // TODO(QueryError): Deprecated core starts from raw fetch errors; migrate or remove before enforcing QueryError everywhere.
        return props.reduce(
            (prev, curr) => prev.then(curr.onResolved, curr.onRejected),
            fetch(...fetchArgs) as Promise<unknown>,
        ) as ReturnType<Yak<Res>>;
    }

    function pipe<NextRes = Res, Fallback = never>(
        onResolved?: (res: Res) => Awaitable<NextRes>,
        onRejected?: (err: unknown) => Awaitable<Fallback>,
    ): Yak<Awaited<NextRes | Fallback>> {
        const newProps = props.concat([{ onResolved, onRejected }] as CreateYakProps);
        const newYak = createYak<Awaited<NextRes | Fallback>>(newProps);

        return newYak;
    }
}

export type { Yak, YakOnResolved, YakOnRejected };
export { createYak };
