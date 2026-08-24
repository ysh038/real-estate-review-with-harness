import { reviewSchema } from "@repo/types";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import type { TOfficeSummaryRow } from "../../services/officeService";
import {
  createFakeAuthAppDeps,
  createFakeSessionRepository,
} from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const OFFICE: TOfficeSummaryRow = {
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
  office = OFFICE as TOfficeSummaryRow | null,
  reviewRepositoryOverrides = {},
}: {
  office?: TOfficeSummaryRow | null;
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

describe("POST /api/offices/:id/reviews — 거래정보·방문시기 필드 (review-deal-and-visit-fields)", () => {
  it("AC1: dealType이 허용값이 아니면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, dealType: "옥탑방" }),
    });

    expect(res.status).toBe(400);
  });

  it("AC2: dealResult가 허용값이 아니면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, dealResult: "보류" }),
    });

    expect(res.status).toBe(400);
  });

  it("AC3: visitedYear가 범위 밖(1999)이면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, visitedYear: 1999, visitedMonth: 3 }),
    });

    expect(res.status).toBe(400);
  });

  it("AC4: visitedMonth가 범위 밖(13)이면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, visitedYear: 2026, visitedMonth: 13 }),
    });

    expect(res.status).toBe(400);
  });

  it("AC5: visitedYear만 있고 visitedMonth가 없으면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, visitedYear: 2026 }),
    });

    expect(res.status).toBe(400);
  });

  it("AC5: visitedMonth만 있고 visitedYear가 없으면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, visitedMonth: 3 }),
    });

    expect(res.status).toBe(400);
  });

  it("AC6: 네 필드를 전부 생략해도 201이고 응답 필드는 전부 null이다", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.dealType).toBeNull();
    expect(body.dealResult).toBeNull();
    expect(body.visitedYear).toBeNull();
    expect(body.visitedMonth).toBeNull();
  });

  it("AC7: 네 필드를 채워 보내면 응답에 그대로 반영된다", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...VALID_BODY,
        dealType: "전세",
        dealResult: "계약함",
        visitedYear: 2026,
        visitedMonth: 3,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.dealType).toBe("전세");
    expect(body.dealResult).toBe("계약함");
    expect(body.visitedYear).toBe(2026);
    expect(body.visitedMonth).toBe(3);
  });
});

describe("POST /api/offices/:id/reviews — 태그 (review-tags)", () => {
  it("AC1: 화이트리스트 밖 태그가 섞이면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, tags: ["친절함", "존재하지않는태그"] }),
    });

    expect(res.status).toBe(400);
  });

  it("AC2: 7개 이상이면 400", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...VALID_BODY,
        tags: [
          "매물 많음",
          "응답 빠름",
          "허위매물 없음",
          "친절함",
          "강매 없음",
          "설명 꼼꼼",
          "매물 많음",
        ],
      }),
    });

    expect(res.status).toBe(400);
  });

  it("AC3: tags를 생략해도 201이고 응답의 tags는 빈 배열이다", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tags).toEqual([]);
  });

  it("AC4: tags를 채워 보내면 응답에 그대로 반영된다", async () => {
    const { app, sessionRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, tags: ["친절함", "응답 빠름"] }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tags).toEqual(["친절함", "응답 빠름"]);
  });

  it("AC7: 중복 태그가 섞여도 repository.insert에는 중복 제거돼 전달된다", async () => {
    const { app, sessionRepository, reviewRepository } = buildAuthedApp();
    const headers = await withSession(sessionRepository);

    await app.request(`/api/offices/${OFFICE.id}/reviews`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, tags: ["친절함", "친절함", "응답 빠름"] }),
    });

    expect(reviewRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["친절함", "응답 빠름"] }),
    );
  });
});
