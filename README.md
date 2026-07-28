Built on Fetch. API-compatible with Fetch.

2 kB, with built-in non-throw mode, types, [Standard Schema](https://standardschema.dev/), throw on non-2xx, timeouts, and retries.

```
npm install @jynxio/query
```

<br />
<br />

## Non-throw

```ts
const handle = await query.safe(url);

handle.ok && handle.data;  // Response
handle.ok || handle.error; // unknown
```

<br />
<br />

## Types

`then()` and `catch()` infer types.

```ts
query(url)
    .then((res) => 1 as const)  // res: Response
    .then((num) => 2 as const)  // num: 1
    .then((num) => 3 as const); // num: 2

query(url)
    .then((res) => 1 as const)  // res: Response
    .catch((err) => 2 as const) // err: unknown
    .then((num) => 3 as const); // num: 1 | 2
```

<br />
<br />

## Standard Schema

`json()` supports [Standard Schema](https://standardschema.dev/).

```ts
import * as z from "zod";

const res = await query(url);           // res: Response
const raw = await res.json();           // raw: JSONData
const num = await res.json(z.number()); // num: number

type JSONData = null | boolean | number | string | JSONData[] | { [key: string]: JSONData };
```

<br />
<br />

## Throw on non-2xx

<details>

<summary>How to customize?</summary>

```ts
import { Query } from "@jynxio/query";

const customQuery = new Query({ shouldThrow });

function shouldThrow(res: Response): boolean {
    if (res.ok) return false;
    if (res.type === "opaque") return false;

    return true;
}
```

</details>

By default, a non-2xx response (unless opaque) is treated as an error. The error is the original response.

```ts
const handle = await query.safe(url);
if (handle.ok) return;

const isRes = handle.error instanceof Response;
if (!isRes) return;

handle.error.text();
```

<br />
<br />

## Timeout

<details>

<summary>How to customize?</summary>

```ts
import { Query } from "@jynxio/query";

const customQuery = new Query({
    attemptTimeout: 10_000,
    overallTimeout: 100_000,
});
```

</details>

By default, each attempt times out after 10s; the overall call has no limit.

<br />
<br />

## Retry

<details>

<summary>How to customize?</summary>

```ts
import { Query } from "@jynxio/query";

const customQuery = new Query({ shouldRetry });

type ShouldRetryProps = {
    /** Attempt number, starting at 1. */
    no: number;
    /** Input from the previous attempt. */
    input: Request;
    /** Output from the previous attempt. */
    output: { ok: true; data: Response } | { ok: false; error: unknown };
};

function shouldRetry(prevAttempt: ShouldRetryProps): number | false {
    /** Retry after 3 seconds. */
    if (prevAttempt.no <= 5) return 3_000;

    /**
     * Stop retrying and exit the query.
     *
     * Resolve with prevAttempt.output.data if successful;
     * otherwise, throw prevAttempt.output.error.
     */
    return false;
}
```

</details>

By default, retries happen when all of the following apply:

- The request was not manually aborted.
- The overall call did not time out.
- The retry count is at most 2.
- The Request method is GET, PUT, HEAD, DELETE, OPTIONS, or TRACE.
- The underlying FetchLike rejects, or the Response status is 408, 413, 429, 500, 502, 503, or 504.

By default, `Retry-After` takes precedence; otherwise, exponential backoff is used. Both include jitter.
