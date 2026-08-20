import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import { createFakeAuthAppDeps } from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const WEB_BASE_URL = "http://localhost:3000";

/**
 * apps/web(Next.js)과 apps/api(Hono)는 항상 다른 origin(포트)이다 — CORS 미설정이면
 * 브라우저 fetch가 전부 막힌다. office-marker-bbox-sync 명세 브라우저 검증에서 실제로
 * 겪은 회귀를 막는다.
 *
 * [의도적 수정 — kakao-oauth-login] 세션 쿠키가 생기면서 `credentials: true`가 필요해졌고,
 * 와일드카드 origin은 그 옵션과 함께 쓸 수 없다(스펙 위반). 그래서 "아무 origin이나 허용"에서
 * "설정된 webBaseUrl만 허용"으로 요구사항 자체가 바뀌었다 — 이 테스트도 그에 맞춰 고친다.
 */
const buildApp = () =>
  createApp({
    officeRepository: createFakeOfficeRepository([]),
    reviewRepository: createFakeReviewRepository(),
    ...createFakeAuthAppDeps(),
    webBaseUrl: WEB_BASE_URL,
  });

describe("CORS", () => {
  it("설정된 webBaseUrl과 일치하는 origin에는 Access-Control-Allow-Origin을 내려준다", async () => {
    const res = await buildApp().request("/health", {
      headers: { Origin: WEB_BASE_URL },
    });

    expect(res.headers.get("access-control-allow-origin")).toBe(WEB_BASE_URL);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("설정된 webBaseUrl과 다른 origin에는 허용 헤더를 내려주지 않는다", async () => {
    const res = await buildApp().request("/health", {
      headers: { Origin: "http://evil.example.com" },
    });

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
