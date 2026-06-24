// /**
//  * Class 风格的 Yak
//  * 只是实验，没有采用
//  */

// import type { Awaitable, FetchArgs } from "./_misc/types";

// type YakRunResult<Res> = Omit<Promise<Res>, "then" | "catch"> & {
//     then: <NextRes = Res, Fallback = never>(
//         onResolved?: (res: Res) => Awaitable<NextRes>,
//         onRejected?: (err: unknown) => Awaitable<Fallback>,
//     ) => YakRunResult<Awaited<NextRes | Fallback>>;

//     catch: <Fallback = never>(
//         onRejected?: (err: unknown) => Awaitable<Fallback>,
//     ) => YakRunResult<Awaited<Res | Fallback>>;
// };

// type YakPipeStep = {
//     onResolved: ((value: unknown) => unknown) | undefined;
//     onRejected: ((reason: unknown) => unknown) | undefined;
// };

// type YakOnResolved<Res> = Parameters<Yak<Res>["pipe"]>[0];
// type YakOnRejected<Res> = Parameters<Yak<Res>["pipe"]>[1];

// class Yak<Res = Response> {
//     readonly #steps: readonly YakPipeStep[];

//     constructor(steps: readonly YakPipeStep[] = []) {
//         this.#steps = steps;
//     }

//     run(...fetchArgs: FetchArgs): YakRunResult<Res> {
//         return this.#steps.reduce(
//             (prev, curr) => prev.then(curr.onResolved, curr.onRejected),
//             fetch(...fetchArgs) as Promise<unknown>,
//         ) as YakRunResult<Res>;
//     }

//     pipe<NextRes = Res, Fallback = never>(
//         onResolved?: (res: Res) => Awaitable<NextRes>,
//         onRejected?: (err: unknown) => Awaitable<Fallback>,
//     ): Yak<Awaited<NextRes | Fallback>> {
//         const nextStep: YakPipeStep = {
//             onResolved: onResolved as YakPipeStep["onResolved"],
//             onRejected,
//         };

//         return new Yak<Awaited<NextRes | Fallback>>([...this.#steps, nextStep]);
//     }
// }

// const yak = new Yak();

// export type { YakOnRejected, YakOnResolved, YakRunResult };
// export { Yak, yak };
