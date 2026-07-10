# Testing

<!-- TODO(i18n): Translate the remaining Chinese documentation to English. -->

只测 Query 自己改过的行为。

不测 Query 是否和 Fetch 完全一样。这个承诺先靠源码足够小、人工 review、类型定义和后续维护来保证。

## 原则

- 原生 `fetch` 是对照组。
- 同样的入参先给 `fetch`，再给 `query`。
- 对比输出、错误、调用次数和时间。
- 只有 Query 文档承诺的差异可以存在。
- 对照测试要隔离缓存影响。每个 case 使用唯一 URL，或显式使用不会命中缓存的 fetch-like。
- 普通模式和 `safe()` 使用同一套行为 case。`safe()` 只改变返回形态，不改变 Query 行为。

## 要测的差异

### Non-2xx as error

- `fetch`：返回 `Response`
- `query`：抛 `Query.Error("http")`

### Lazy error body

- `fetch`：用户自己读 body
- `query`：错误上用 `statusError()` 读 body
- 需要测：
    - JSON body
    - text body
    - `application/*+json`
    - 空 body
    - JSON parse 失败
    - 多次调用复用缓存
    - 读 body 时传入的 `signal`
    - `signal` 已经 aborted
    - 读取过程中 aborted
    - 读取耗时上限
    - 读取体积上限

### Retry

- `fetch`：调用一次
- `query`：按策略调用多次
- 需要测：
    - 默认 retry 次数
    - 默认 retry method 白名单
    - 默认 retry status 白名单
    - `Retry-After: 0`
    - `Retry-After` 秒数
    - `Retry-After` HTTP date
    - 自定义 retry 收到 `no`、`input`、`output`
    - 自定义 retry 停止重试
    - 网络/unknown error 是否按策略处理
    - 重试前 cancel 上一次失败 response body
    - retry delay 会计入 `overallTimeout`

### Timeout

- `fetch`：不会自己超时
- `query`：`attemptTimeout` / `overallTimeout` 到点后抛 `Query.Error("timeout")`
- 需要测：
    - `attemptTimeout`
    - `overallTimeout`
    - `attemptTimeout` 和 `overallTimeout` 同时存在
    - retry delay 超过剩余 `overallTimeout`
    - 成功后 timer 会清理
    - 0ms timeout/delay 边界

### Abort normalization

- `fetch`：抛原始 abort / timeout cause
- `query`：归一成 `Query.Error("abortion")` 或 `Query.Error("timeout")`
- 需要测：
    - 用户传入的 `signal` 真的传入内部 fetch
    - 用户 `AbortError`
    - 用户 `TimeoutError`
    - 用户 abort 和 attempt timeout 冲突
    - 用户 abort 和 overall timeout 冲突
    - 冲突时先发生的原因胜出
    - abort 时不继续 retry

### Standard Schema

- `fetch`：`response.json()` 只解析 JSON
- `query`：`response.json(schema)` 会校验并返回 schema output
- 需要测：
    - `json()` 不传 schema 时等同原生 JSON parsing
    - schema validate 成功
    - schema validate 失败
    - async schema validate 成功/失败
    - schema error 是 `Query.Error("json")`

### Unknown errors

- `fetch`：抛用户自己在 fetch-like 里抛出的错误
- `query`：包装成 `Query.Error("unknown")`
- 需要测：
    - fetch-like throw `Error`
    - fetch-like reject `Error`
    - fetch-like throw 非 Error 值
    - fetch-like 在读取 body / json 阶段抛错

### Safe mode

- `query`：抛错
- `query.safe`：返回 `{ ok: false, error }`
- 需要测：
    - 同一套 Query delta case 同时跑普通模式和 safe 模式
    - 普通模式成功时 safe 返回 `{ ok: true, data }`
    - 普通模式抛 `Query.Error(type)` 时 safe 返回 `{ ok: false, error }`
    - safe 不吞掉行为差异，只改变返回形态
- 不要复制两份模板代码。写共享 case runner。

### Types

- `then` / `catch` 的 error 类型始终是 `unknown`
- `safe()` 能正确 narrow
- 公共类型从 `Query`、`query` 和 `Query.Error` 推导，不额外导出聚合类型
- 需要测：
    - `then(onResolved)` 的返回值成为下一层 `then` 的入参
    - `then(onRejected)` 的返回值参与下一层 `then` 的入参
    - `catch(onRejected)` 的返回值成为 `catch().then(...)` 的入参
    - 多层 `then().catch().then()` 链式传递
    - `safe()` result narrowing
    - `json(schema)` 推导 schema output
    - `retry(prevAttempt)` 的输入输出类型
