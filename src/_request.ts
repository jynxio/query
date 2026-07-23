import { isRequest, isRequestInitEmpty } from "./_misc/guards.ts";

type QueryRequestConstructor = {
    /**
     * A Request with built-in abort support.
     *
     * @remarks
     * Abort may not work when its signal is not injected into the final Request instance. This is intentional: injecting
     * it would make the original and new Request instances non-equivalent. See the Fetch Standard for details.
     *
     * @see {@link https://fetch.spec.whatwg.org/#fetch-method | The fetch(input, init) method steps}
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
        const isOptionsEmpty = isRequestInitEmpty(options);
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

        /**
         * Set `options` as the prototype of `settledOptions` to meet the Fetch Standard requirement that Request access
         * non-enumerable, internal, and inherited RequestInit properties.
         */
        const settledOptions = Object.create(options ?? null);
        Object.defineProperty(settledOptions, "signal", { value: settledSignal });

        super(base, settledOptions);
        this.abort = abort;
        this.clone = clone;
        this.isAbortable = true;

        function abort(reason?: unknown): void {
            ctrl.abort(reason);
        }

        function clone(this: AbortableQueryRequest): AbortableQueryRequest {
            /**
             * Clone before creating a new instance.
             *
             * @remarks
             * Calling `new Request(oldReq)` directly would consume `oldReq`.
             *
             * @see {@link https://fetch.spec.whatwg.org/#request-class | From "Let inputBody be input's request's body if input is a Request object" to "Set this's request's body to finalBody"}
             */
            return new AbortableQueryRequest(Request.prototype.clone.call(this));
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
            /**
             * Clone before creating a new instance.
             */
            return new UnabortableQueryRequest(Request.prototype.clone.call(this));
        };
    }
}

export { QueryRequest };
