type AnyFn = (...args: never[]) => unknown;
type FnReturnType<T> = T extends AnyFn ? ReturnType<T> : T;
type FnParameters<T> = T extends AnyFn ? Parameters<T> : [never];

function toFunction<
    T,
    Args extends unknown[] = FnParameters<T>,
    ReturnType extends FnReturnType<T> = FnReturnType<T>,
>(i: T): (...args: Args) => ReturnType {
    return (...args: Args) => (typeof i === "function" ? i(...args) : i);
}

export { toFunction };
