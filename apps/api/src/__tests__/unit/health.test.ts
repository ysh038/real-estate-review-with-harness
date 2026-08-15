import { describe, expect, it } from "vitest";

import { createApp } from "../../app";

describe("GET /health", () => {
  it("계약 스키마에 맞는 200 응답을 반환한다", async () => {
    const res = await createApp().request("/health");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      status: "ok",
      service: "@repo/api",
    });
  });
});
