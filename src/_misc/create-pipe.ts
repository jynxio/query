type PipeObject<Source> = {
    done(): Source;
    next<Next, Args extends unknown[]>(
        fn: (...args: [Source, ...Args]) => Next,
        ...args: Args
    ): PipeObject<Next>;
};

function createPipe<T>(source: T): PipeObject<T> {
    return { next, done };

    function done(): T {
        return source;
    }

    function next<Next, Args extends unknown[]>(
        fn: (...args: [T, ...Args]) => Next,
        ...args: Args
    ): PipeObject<Next> {
        return createPipe(fn(source, ...args));
    }
}

export { createPipe };
