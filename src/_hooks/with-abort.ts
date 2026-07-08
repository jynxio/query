function withAbort<Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
): (...args: Args) => { promise: Promise<R>; abort: (reason?: unknown) => void } {
    return function (...args: Args) {
        const ctrl = Promise.withResolvers<never>();
        const abort = (reason?: unknown) => ctrl.reject(reason);
        const promise = Promise.race([fn(...args), ctrl.promise]);

        return { abort, promise };
    };
}

export { withAbort };
