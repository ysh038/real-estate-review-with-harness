import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import {
  createFakeKakaoOAuthClient,
  createFakeSessionRepository,
  createFakeUserRepository,
} from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const WEB_BASE_URL = "http://localhost:3000";

const buildApp = () => {
  const sessionRepository = createFakeSessionRepository();
  const userRepository = createFakeUserRepository();
  const app = createApp({
    officeRepository: createFakeOfficeRepository(),
    reviewRepository: createFakeReviewRepository(),
    oauthClient: createFakeKakaoOAuthClient(),
    userRepository,
    sessionRepository,
    webBaseUrl: WEB_BASE_URL,
    isProduction: false,
    adminApiKey: undefined,
  });
  return { app, sessionRepository, userRepository };
};

describe("GET /api/me", () => {
  it("AC5: 유효한 세션 쿠키면 200과 사용자 정보를 반환한다", async () => {
    const { app, sessionRepository } = buildApp();
    await sessionRepository.create({
      id: "sess-1",
      userId: "u-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const res = await app.request("/api/me", {
      headers: { Cookie: "session_id=sess-1" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      id: "u-1",
      nickname: "홍길동",
      profileImageUrl: null,
    });
  });

  it("AC6: 세션 쿠키가 없으면 401", async () => {
    const { app } = buildApp();

    const res = await app.request("/api/me");

    expect(res.status).toBe(401);
  });

  it("AC6: 세션이 만료됐으면 401", async () => {
    const { app, sessionRepository } = buildApp();
    await sessionRepository.create({
      id: "expired",
      userId: "u-1",
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await app.request("/api/me", {
      headers: { Cookie: "session_id=expired" },
    });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("AC7: 로그아웃하면 세션이 무효화되고 이후 /api/me 는 401이 된다", async () => {
    const { app, sessionRepository } = buildApp();
    await sessionRepository.create({
      id: "sess-1",
      userId: "u-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const logoutRes = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: "session_id=sess-1" },
    });
    expect(logoutRes.status).toBe(204);
    expect(sessionRepository.store.has("sess-1")).toBe(false);

    const meRes = await app.request("/api/me", {
      headers: { Cookie: "session_id=sess-1" },
    });
    expect(meRes.status).toBe(401);
  });
});

describe("GET /auth/kakao", () => {
  it("state 쿠키를 발급하고 카카오 인증 URL로 리다이렉트한다", async () => {
    const { app } = buildApp();

    const res = await app.request("/auth/kakao", { redirect: "manual" });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("https://kauth.kakao.com");
    expect(res.headers.get("set-cookie")).toContain("kakao_oauth_state=");
  });
});
