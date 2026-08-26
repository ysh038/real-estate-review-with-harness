import { authUserSchema } from "@repo/types";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import {
  createFakeAuthAppDeps,
  createFakeSessionRepository,
} from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const buildApp = () => {
  const sessionRepository = createFakeSessionRepository();
  const app = createApp({
    ...createFakeAuthAppDeps(),
    sessionRepository,
    officeRepository: createFakeOfficeRepository(),
    reviewRepository: createFakeReviewRepository(),
  });
  return { app, sessionRepository };
};

const withSession = async (
  sessionRepository: ReturnType<typeof createFakeSessionRepository>,
) => {
  await sessionRepository.create({
    id: "sess-1",
    userId: "u-1",
    expiresAt: new Date(Date.now() + 60_000),
  });
  return { Cookie: "session_id=sess-1" };
};

describe("PATCH /api/users/me", () => {
  it("AC4: 세션 쿠키 없이 요청하면 401", async () => {
    const { app } = buildApp();

    const res = await app.request("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "새닉네임" }),
    });

    expect(res.status).toBe(401);
  });

  it("AC5: 유효한 닉네임(1~20자)이면 200과 갱신된 사용자 정보를 반환한다", async () => {
    const { app, sessionRepository } = buildApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/users/me", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "새닉네임" }),
    });

    expect(res.status).toBe(200);
    const body = authUserSchema.parse(await res.json());
    expect(body.nickname).toBe("새닉네임");
  });

  it("AC6: 빈 문자열이면 400", async () => {
    const { app, sessionRepository } = buildApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/users/me", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "" }),
    });

    expect(res.status).toBe(400);
  });

  it("AC6: 21자 이상이면 400", async () => {
    const { app, sessionRepository } = buildApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/users/me", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "가".repeat(21) }),
    });

    expect(res.status).toBe(400);
  });

  it("AC7: 갱신 후 GET /api/me를 다시 조회하면 새 닉네임이 보인다", async () => {
    const { app, sessionRepository } = buildApp();
    const headers = await withSession(sessionRepository);

    await app.request("/api/users/me", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "새닉네임" }),
    });
    const res = await app.request("/api/me", { headers });

    const body = authUserSchema.parse(await res.json());
    expect(body.nickname).toBe("새닉네임");
  });
});
