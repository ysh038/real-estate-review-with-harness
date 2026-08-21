import { reviewSchema, type TOfficeSummary } from "@repo/types";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import {
  createFakeAuthAppDeps,
  createFakeSessionRepository,
} from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const OFFICE: TOfficeSummary = {
  id: "41135-2020-00001",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
};

const VALID_BODY = { rating: 5, content: "열 자를 넘기는 충분한 길이의 리뷰" };

/**
 * getClientIp는 hono/bun의 getConnInfo를 통해 fetch의 2번째 인자(Bun Server)에서
 * IP를 읽는다. app.request()의 3번째 인자(Env)로 그 모양을 흉내낸다 — 실제 Bun 서버
 * 기동 없이도 rate limit 경로를 테스트하기 위함(설계 메모: lib/clientIp.ts 참고).
 */
const FAKE_BUN_ENV = {
  requestIP: () => ({ address: "203.0.113.1", family: "IPv4", port: 1 }),
};

const buildAuthedApp = ({
  office = OFFICE as TOfficeSummary | null,
  reviewRepositoryOverrides = {},
}: {
  office?: TOfficeSummary | null;
  reviewRepositoryOverrides?: Partial<
    ReturnType<typeof createFakeReviewRepository>
  >;
} = {}) => {
  const sessionRepository = createFakeSessionRepository();
  const officeRepository = {
    ...createFakeOfficeRepository(office ? [office] : []),
    findById: async () => office,
  };
  const reviewRepository = {
    ...createFakeReviewRepository(),
    ...reviewRepositoryOverrides,
  };
  const app = createApp({
    ...createFakeAuthAppDeps(),
    sessionRepository,
    officeRepository,
    reviewRepository,
  });
  return { app, sessionRepository, reviewRepository };
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

describe("POST /api/offices/:id/reviews", () => {
  it("AC1: 세션 쿠키 없이 요청하면 401", async () => {
    const { app } = buildAuthedApp();

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(401);
  });

  it("AC2: 존재하지 않는 사무소면 404", async () => {
    const { app, sessionRepository } = buildAuthedApp({ office: null });
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/offices/no-such-office/reviews", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(404);
  });

  it("AC3: rating이 범위 밖이면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, rating: 6 }),
    });

    expect(res.status).toBe(400);
  });

  it("AC4: content가 10자 미만이면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, content: "짧음" }),
    });

    expect(res.status).toBe(400);
  });

  it("AC5: 정상 요청이면 201과 작성자 정보가 포함된 리뷰를 반환한다", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(201);
    const parsed = reviewSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.author.nickname).toBe("홍길동");
  });

  it("AC6: 이미 리뷰를 작성한 사무소면 409", async () => {
    const { app, sessionRepository } = buildAuthedApp({
      reviewRepositoryOverrides: {
        insert: async () => {
          throw { code: "23505" };
        },
      },
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(409);
  });

  it("AC7: 같은 (IP, 사무소)에 24시간 안의 리뷰가 있으면 429", async () => {
    const { app, sessionRepository } = buildAuthedApp({
      reviewRepositoryOverrides: {
        hasRecentReviewFromIp: async () => true,
      },
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(
      `/api/offices/${OFFICE.id}/reviews`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(VALID_BODY),
      },
      FAKE_BUN_ENV,
    );

    expect(res.status).toBe(429);
  });

  it("AC7: 클라이언트 IP를 알 수 없으면(env 없음) rate limit을 건너뛰고 작성된다", async () => {
    const { app, sessionRepository } = buildAuthedApp({
      reviewRepositoryOverrides: {
        hasRecentReviewFromIp: async () => true,
      },
    });
    const headers = await withSession(sessionRepository);

    // FAKE_BUN_ENV 를 안 넘긴다 — getClientIp가 null을 돌려주므로 위 mock이 걸려도 무시돼야 한다.
    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(201);
  });
});
