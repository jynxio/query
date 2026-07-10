import { isRequest } from "./_misc/guards.ts";

type QueryRequestConstructor = {
    /**
     * A Request with built-in Abort support.
     *
     * @remarks
     * In some cases, Abort does not work because the Signal it relies on is not injected into the final Request instance.
     * This is intentional, because injecting it would make the original and new Request instances non-equivalent. See the
     * Fetch Standard for details.
     *
     * @see {@link https://fetch.spec.whatwg.org/#fetch-method | The fetch(input, init) method steps are}
     * @see {@link https://fetch.spec.whatwg.org/#request-class | The new Request(input, init) constructor steps}
     *
     * @internal
     */
    new (...args: ConstructorParameters<typeof Request>): AbortableQueryRequest | UnabortableQueryRequest;
};

type QueryRequest = AbortableQueryRequest | UnabortableQueryRequest;

const QueryRequest = class {
    constructor(...[base, options]: ConstructorParameters<typeof Request>) {
        const isBaseRequest = isRequest(base);
        const isOptionsEmpty = Object.keys(options ?? {}).length === 0;
        const isUnabortable = isBaseRequest && isOptionsEmpty;

        if (isUnabortable) return new UnabortableQueryRequest(base, options);

        return new AbortableQueryRequest(base, options);
    }
} as QueryRequestConstructor;

class AbortableQueryRequest extends Request {
    public readonly isAbortable: true;
    public readonly clone: () => AbortableQueryRequest;
    public readonly abort: (reason?: unknown) => void;

    constructor(...[base, options]: ConstructorParameters<typeof Request>) {
        const ctrl = new AbortController();
        const optsSignal = options?.signal;
        const baseSignal = isRequest(base) ? base.signal : undefined;
        const userSignal = optsSignal === undefined ? baseSignal : optsSignal;
        const settledSignal = AbortSignal.any([userSignal ?? [], ctrl.signal].flat());

        super(base, { ...options, signal: settledSignal });
        this.abort = abort;
        this.clone = clone;
        this.isAbortable = true;

        function abort(reason?: unknown): void {
            ctrl.abort(reason);
        }

        function clone(this: AbortableQueryRequest): AbortableQueryRequest {
            return new AbortableQueryRequest(this);
        }
    }
}

class UnabortableQueryRequest extends Request {
    public readonly isAbortable: false;
    public readonly clone: () => UnabortableQueryRequest;
    public readonly abort: (reason?: unknown) => void;

    constructor(...args: ConstructorParameters<typeof Request>) {
        super(...args);

        this.isAbortable = false;
        this.abort = function (_reason?: unknown) {};
        this.clone = function (this: UnabortableQueryRequest) {
            return new UnabortableQueryRequest(this);
        };
    }
}

export { QueryRequest };
