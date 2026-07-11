type PipeObject<Source> = {
    done(): Source;
    next<Next, Args extends unknown[]>(
        fn: (...args: [Source, ...Args]) => Next,
        ...args: Args
    ): PipeObject<Next>;
};

function pipe<T>(source: T): PipeObject<T> {
    return { next, done };

    function done(): T {
        return source;
    }

    function next<Next, Args extends unknown[]>(
        fn: (...args: [T, ...Args]) => Next,
        ...args: Args
    ): PipeObject<Next> {
        return pipe(fn(source, ...args));
    }
}

export { pipe };
