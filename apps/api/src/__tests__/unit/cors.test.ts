import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

/**
 * apps/web(Next.js)과 apps/api(Hono)는 항상 다른 origin(포트)이다 — CORS 미설정이면
 * 브라우저 fetch가 전부 막힌다. office-marker-bbox-sync 명세 브라우저 검증에서 실제로
 * 겪은 회귀를 막는다.
 */
describe("CORS", () => {
  it("다른 origin에서의 요청에도 Access-Control-Allow-Origin 헤더를 내려준다", async () => {
    const app = createApp({
      officeRepository: createFakeOfficeRepository([]),
      reviewRepository: createFakeReviewRepository(),
    });

    const res = await app.request("/health", {
      headers: { Origin: "http://localhost:3001" },
    });

    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});
