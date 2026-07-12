type State<T> =
    | { phase: "idle" }
    | { phase: "pending"; value: Promise<T> }
    | { phase: "fulfilled"; value: Promise<T> }
    | { phase: "rejected" };

function memoize<Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R> {
    let state: State<R> = { phase: "idle" };

    return function memoizedFn(...args: Args): Promise<R> {
        if (state.phase === "fulfilled") return state.value;
        if (state.phase === "pending") return state.value;

        const value = fn(...args);

        state = { phase: "pending", value };
        value
            .then(() => (state = { phase: "fulfilled", value }))
            .catch(() => (state = { phase: "rejected" }));

        return value;
    };
}

export { memoize };
