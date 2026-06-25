# normalize-http-error 草案

目标：把 HTTP 非成功响应归一化成 `YakError("http")`，不替用户解决错误。

## API 形态

```ts
const api = yak.pipe(normalize);

try {
    await api("/user");
} catch (err) {
    if (err.type === "http") {
        err.cause.statusCode;
        err.cause.statusText;
        err.cause.response;
        await err.cause.statusError();
    }
}
```

HTTP error 字段：

```ts
type YakHttpError = Error & {
    type: "http";
    cause: {
        response: Response;
        statusCode: number;
        statusText: string;
        statusError: () => Promise<unknown>;
    };
};
```

暂不提供 `request`。

## 行为

- `res.ok === true`：原样返回 `Response`。
- `res.type === "opaque"`：原样返回 `Response`，借鉴 ky，不把浏览器隐藏状态的响应当成明确 HTTP 失败。
- 其他 `res.ok === false`：抛 `YakError("http")`。
- 不提供 `shouldThrow` 一类的成功/失败判定 hook；用户要把 `3xx`、`404` 当成功，可以在后续 rejected handler 里接住 `YakError("http")` 自己处理。
- `statusError()` 在 `err.cause` 上，懒读取错误 body。
- 创建 error 时立刻 `response.clone()`，避免后续原始 `response` 被消费后无法读取。
- `statusError()` 结果 memoize，多次调用返回同一个读取结果。

## 错误 body 读取

- 读取上限：`1 MiB`。
- 读取超时：先定 `10s`。
- 超过上限、读取超时、读取失败、解析失败：返回 `undefined`。
- 不让 body 读取失败覆盖原始 HTTP error。

解析规则：

- JSON content type：返回 `JSON.parse(text)`。
- 非 JSON content type：返回 `string`。

JSON 判断：

```ts
const mime = contentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
const isJson = /\/(?:.*[.+-])?json$/.test(mime);
```

## 实现要点

- 用 `response.body?.getReader()` 分块读取，累计 `byteLength`。
- 超过 `1 MiB` 后 `reader.cancel()` 并返回 `undefined`。
- 用 `timeOut` 做读取超时；结束后调用 `reader.cancel()` 释放 reader。
- 用 `safe` 包住 clone、getReader、读取、JSON parse；失败时返回 `undefined`。
- 没有 `response.body` 时 fallback 到 `response.text()`，但仍要走 timeout。

## 和 body hooks 的边界

`normalize()` 只判断 HTTP 成败，不负责把成功响应解析成数据。

`json()`、`text()` 之类的 body hooks 负责处理无 body 场景：

- `101`：Switching Protocols，协议切换响应，例如升级到 WebSocket；没有常规 response body。
- `204`：No Content，成功但没有 body。
- `205`：Reset Content，成功但要求客户端重置视图，没有 body。
- `304`：Not Modified，条件请求命中缓存语义；如果真的暴露到 JS 层，通常没有 body。
- `HEAD`：请求方法只要响应头，不返回 body。

这些场景在 body hooks 中应返回 `undefined`，不要尝试解析空 body。
