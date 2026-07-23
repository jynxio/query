# Design Notes for Reviewers

This file records deliberate design choices that may otherwise look like mistakes during an isolated code review.
Treat them as constraints unless the public API requirements change.

## Promise model

- `QueryPromise<T>` is a structural refinement of the native `Promise<T>`, not a runtime wrapper, subclass, or brand.
  The `QueryPromise` value is intentionally the native `Promise` constructor with more precise declarations.
- Native promises are expected to satisfy `QueryPromise` structurally. Code such as `async` functions and
  `Promise.race()` does not need a wrapper or assertion merely because it returns a native promise at runtime.
- `then`, `catch`, and `finally` return `QueryPromise` in the public type so enhanced typing survives a chain.
- Callback and resolver inputs deliberately use the standard `PromiseLike<T>`. Replacing it with a narrower custom
  thenable would violate substitutability and reject valid third-party thenables.
- Promise rejection reasons remain `unknown`. The library preserves arbitrary rejection reasons instead of broadly
  reclassifying them into a library-owned error type; doing otherwise could mislabel user-defined values as timeouts
  or aborts.
- `query.safe()` converts promise rejections to `{ ok: false, error: unknown }` without changing the rejection reason.
  Although rejecting with an `Error` is conventional, JavaScript permits any value and the safe API preserves it.
- `withSafe()` intentionally handles promise rejections only. A synchronous exception thrown while invoking the
  wrapped function is not converted to a safe result; `withRetry()` relies on this to keep synchronous failures from a
  custom Fetch-compatible function out of the retry policy.
- `withExternalize()` is deliberately async so exceptions from constructing `QueryRequest` become promise rejections,
  matching `fetch()` for invalid input. Consequently, public `query()` and `query.safe()` still return promises for
  invalid request arguments.

## Public API shape

- `new Query()` intentionally returns a callable function with a `.safe` function. The constructor assertion in
  `index.ts` models this unusual but deliberate runtime API. Do not convert it to a conventional class merely to make
  `instanceof Query` work.
- The package intentionally does not export a `QueryType` aggregate. Consumers can derive types from `Query`, `query`,
  and the static members `Query.Promise`, `Query.Request`, and `Query.Response`; keeping the export surface small is
  preferred until concrete demand appears.
- Passing an existing `Request` without a non-empty `RequestInit` remains supported, but is intentionally marked
  `@deprecated` on that overload. Here `@deprecated` means "supported but not recommended"; it does not promise future
  removal. A URL input or a non-empty init is preferred because it permits reliable internal cancellation.
- The deprecated-overload warning is necessarily based on static types. If an init value is typed broadly as
  `RequestInit`, TypeScript cannot know whether the object will be empty at runtime.

## Request and abort behavior

- The Fetch Standard stores a request's signal internally during construction. Overriding a public `signal` property
  later does not change the signal used by `fetch`.
- When the input is already a `Request` and init is empty, `QueryRequest` deliberately avoids injecting its controller
  signal because reconstruction can make the new request observably different from the original. In this case,
  `request.abort()` may intentionally have no effect on the underlying fetch.
- When reconstruction is allowed, `QueryRequest` combines the explicit or inherited user signal with its internal
  controller signal. An explicit `signal: null` clears the inherited base signal, matching native `Request` semantics.
- Each abortable request clone owns a new controller while inheriting its parent's signal. Aborting one attempt
  therefore stops that attempt without poisoning later sibling attempts, while aborting the root request still
  propagates to the active attempt.
- `QueryRequest.prototype.clone()` first tees the body via `Request.prototype.clone()` and only then reconstructs the
  new instance. Reconstructing directly with `new Request(this)` would consume the source body, so the second retry of
  a request that carries a body would otherwise throw `TypeError`. The root request is only ever used as a clone
  source, never fetched directly, so it stays re-clonable across every attempt.
- Retry delays observe the root request signal, not the completed attempt's signal. An attempt timeout has already
  aborted the latter and must not cancel the delay before the next attempt.
- `sleep()` propagates `signal.reason` unchanged so a custom abort reason is not replaced by a library error.
- `withAbort()` is the fallback for cases where `QueryRequest.abort()` cannot cancel the underlying fetch. It settles
  the query from the caller's perspective even if the network operation continues in the background.

## Timeout and retry behavior

- `withTimeout()` assumes that its caller supplies a valid duration. It does not promise to validate or recover from
  invalid duration values.
- `withRetry()` tags the request signal with identity-stable sentinel symbols (one for overall timeout, one for
  per-attempt timeout) so the retry loop can classify an abort internally. These sentinels never surface to the
  caller: an overall or per-attempt timeout is always rethrown as a fresh `TimeoutError` `DOMException`.
- `options.shouldRetry` receives the previous result as `Safe<QueryResponse, unknown>` and returns `false` to stop or a
  non-negative millisecond delay to retry. Fulfilled responses and asynchronous request failures are passed to it;
  synchronous setup failures, overall timeout, and user abort bypass it. A per-attempt timeout may be retried.
- The default `shouldRetry` policy retries rejected outputs for eligible methods regardless of the rejection reason. A
  custom Fetch-compatible implementation can therefore have its asynchronous rejection retried unless a custom policy
  declines it.
- `options.shouldRetry` is trusted to return a valid delay. A delay above the `setTimeout` ceiling (for example from a
  large `Retry-After`) or a negative delay surfaces as a `RangeError`; the library does not clamp it, keeping the delay
  transparent to the caller.

## Error and response behavior

- The library deliberately has no `QueryError` wrapper type. Failures surface as their most native form so the public
  API stays close to `fetch`: a rejected transport error keeps its original reason, a timeout is a `TimeoutError`
  `DOMException`, a user abort keeps the user's reason, and a JSON schema failure is a `SchemaError` from
  `@standard-schema/utils`.
- Non-ok responses are thrown as the `QueryResponse` itself when `options.shouldThrow` returns `true`. The default
  policy throws every non-ok response except opaque ones, whose status cannot be inspected. `shouldThrow` runs after
  the retry loop, so it only sees the final response.
- A thrown response is thrown with its body unconsumed, so a caller that catches it can still read `.json()`,
  `.text()`, and other body accessors. Intermediate responses discarded during retry have their body cancelled first.
- `query.safe()` is applied at the end of the same pipeline as normal query execution. It changes only promise
  settlement into `{ ok: true, data } | { ok: false, error }`; it must not change request behavior or rejection values.
  A thrown non-ok response therefore appears as `{ ok: false, error: QueryResponse }` in safe mode.

## Internal pipeline

- `_fetch.ts` was intentionally removed. `NormalizedFetch` is the internal one-request function type, and
  `withInternalize()` adapts the global Fetch-compatible function to it.
- `withInternalize()` deliberately does not use an async wrapper: a custom Fetch-compatible function's synchronous
  exception must remain synchronous at the retry boundary and bypass `options.retry`.
- The hook order in `index.ts` is intentional: internalize, retry, convert HTTP failures, then externalize. Safe mode
  adds `withSafe()` only after this shared pipeline.

## Review and validation

- Runtime tests do not replace type checking. `vp test` can pass while type-only assertions fail.
- Use the Vite+ workflow: `vp run check:ts`, `vp lint`, and `vp test`. Do not invoke pnpm, npm, Vitest, or TypeScript
  directly for normal project tasks.
- `dom.asynciterable` is intentionally included in `tsconfig.json` because `ReadableStream` is consumed with
  `for await...of`, including under the TypeScript version used by the editor.
