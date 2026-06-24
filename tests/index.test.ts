import { afterEach, expect, test, vi } from "vite-plus/test";
import defaultQuery, { createQuery, query } from "../src/index.ts";

afterEach(() => {
    vi.restoreAllMocks();
});

test("exports query as the default instance", () => {
    expect(defaultQuery).toBe(query);
});

test("query lazily creates its default instance on first call", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"ok":true}'));

    const res = await query("https://example.com/lazy");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await res.json()).toEqual({ ok: true });
});

test("createQuery accepts retry strategy through the retry option", async () => {
    const fetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response("{}", { status: 418 }))
        .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));

    const api = createQuery({ retry: { status: [418], retryCount: 1, retryDelay: 0 } });
    const res = await api("https://example.com/retry");

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
});
