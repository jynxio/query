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
- Rejection reasons are always `unknown`, including the initial query promise. Internal code attempts to normalize
  failures to `QueryError`, but JavaScript can reject or throw any value, and user callbacks can introduce arbitrary
  failures later in a chain. `query.safe()` is the API for consumers who need a typed `QueryError` result.

## Public API shape

- `new Query()` intentionally returns a callable function with a `.safe` function. The constructor assertion in
  `index.ts` models this unusual but deliberate runtime API. Do not convert it to a conventional class merely to make
  `instanceof Query` work.
- The package intentionally does not export a `QueryType` aggregate. Consumers can derive types from `Query`, `query`,
  and `Query.Error`; keeping the export surface small is preferred until concrete demand appears.
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
- `withAbort()` is the fallback for cases where `QueryRequest.abort()` cannot cancel the underlying fetch. It settles
  the query from the caller's perspective even if the network operation continues in the background.

## Error and response behavior

- `withError()` normalizes errors at controlled internal boundaries, but this does not justify changing promise
  rejection types from `unknown`.
- Non-2xx responses become lazy `QueryError<"http">` failures. `statusError(signal?)` reads and caches the cloned error
  body, supports cancellation while reading, and returns `QueryPromise<JSONData>`.
- `query.safe()` is applied at the end of the same pipeline as normal query execution. It changes only the returned
  shape to `{ ok: true, data } | { ok: false, error }`; it must not change request behavior.

## Internal pipeline

- `_fetch.ts` was intentionally removed. `NormalizedFetch` is the internal one-request function type, and
  `withInternalize()` adapts the global Fetch-compatible function to it.
- The hook order in `index.ts` is intentional: internalize, normalize transport errors, retry, convert HTTP failures,
  normalize again, then externalize. Safe mode adds `withSafe` only after this shared pipeline.

## Review and validation

- Runtime tests do not replace type checking. `vp test` can pass while type-only assertions fail.
- Use the Vite+ workflow: `vp run check:ts`, `vp lint`, and `vp test`. Do not invoke pnpm, npm, Vitest, or TypeScript
  directly for normal project tasks.
- `dom.asynciterable` is intentionally included in `tsconfig.json` because `ReadableStream` is consumed with
  `for await...of`, including under the TypeScript version used by the editor.
