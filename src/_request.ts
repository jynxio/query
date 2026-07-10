import { isRequest } from "./_misc/guards.ts";

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
class QueryRequest extends Request {
    public readonly isAbortable: boolean;
    public readonly clone: () => QueryRequest;
    public readonly abort: (reason?: unknown) => void;

    constructor(...[base, options]: ConstructorParameters<typeof Request>) {
        const isBaseRequest = isRequest(base);
        const isOptionsEmpty = Object.keys(options ?? {}).length === 0;
        const isAbortable = isBaseRequest === false || isOptionsEmpty === false;

        const ctrl = new AbortController();
        const optsSignal = options?.signal;
        const baseSignal = isBaseRequest ? base.signal : undefined;
        const userSignal = optsSignal === undefined ? baseSignal : optsSignal;
        const settledSignal = AbortSignal.any([userSignal ?? [], ctrl.signal].flat());
        const settledOptions = isAbortable ? { ...options, signal: settledSignal } : options;

        super(base, settledOptions);
        this.abort = abort;
        this.clone = clone;
        this.isAbortable = isAbortable;

        function abort(reason?: unknown): void {
            ctrl.abort(reason);
        }

        function clone(this: QueryRequest): QueryRequest {
            const request = Request.prototype.clone.call(this);

            return Object.assign(request, { abort, clone, isAbortable });
        }
    }
}

export { QueryRequest };
