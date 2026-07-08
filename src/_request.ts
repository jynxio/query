/**
 * @todo 润色
 * 根据 Fetch Spec，Request instance 在构造或克隆阶段就敲定了 signal 的内容并稳定的存储在内部，
 * fetch 始终都会使用 Request instance 的这个内部的 signal，哪怕你 override 了 Request instance
 * 的 signal 也没用。
 *
 * 如果 base 为 Request 且 Opts 为空，那么就不注入 ctrl.signal，否则新 Request 和 base 就会不等效。
 * 参见 [Fetch Spec - Fetch methods](https://fetch.spec.whatwg.org/#fetch-method)。
 *
 * https://fetch.spec.whatwg.org/#request-class
 * The new Request(input, init) constructor steps
 */

/**
 * @internal
 */
class QueryRequest extends Request {
    readonly isAbortable: boolean;
    readonly clone: () => QueryRequest;
    readonly abort: (reason?: unknown) => void;

    constructor(...[base, opts]: ConstructorParameters<typeof Request>) {
        const isBaseRequest = base instanceof Request;
        const isOptsEmpty = Object.keys(opts ?? {}).length === 0;
        const isAbortable = isBaseRequest === false || isOptsEmpty === false;

        const ctrl = new AbortController();
        const newOpts = isAbortable ? { ...opts, signal: ctrl.signal } : opts;

        super(base, newOpts);
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
