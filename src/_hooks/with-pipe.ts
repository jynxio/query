type PipeObject<Prev> = {
    done(): Prev;
    next<Next>(fn: (i: Prev) => Next): PipeObject<Next>;
};

function withPipe<T>(source: T): PipeObject<T> {
    return { next, done };

    function done(): T {
        return source;
    }

    function next<Next>(fn: (i: T) => Next): PipeObject<Next> {
        return withPipe(fn(source));
    }
}

export { withPipe };
