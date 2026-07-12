type State<T> =
    | { phase: "idle" }
    | { phase: "fulfilled"; response: T }
    | { phase: "rejected"; error?: unknown }
    | { phase: "pending"; promise: Promise<T> };

function memoize<Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
): (...args: Args) => Promise<R> {
    let state: State<R> = { phase: "idle" };

    return function memoizedFn(...args: Args): Promise<R> {
        if (state.phase === "pending") return state.promise;
        if (state.phase === "fulfilled") return Promise.resolve(state.response);

        state = { phase: "pending", promise: fn(...args) };
        state.promise.catch((error) => (state = { phase: "rejected", error }));
        state.promise.then((response) => (state = { phase: "fulfilled", response })).catch(() => {});

        return state.promise;
    };
}

export { memoize };
