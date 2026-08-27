import { reviewSchema } from "@repo/types";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import type { IReviewOwnedRow } from "../../services/reviewService";
import {
  createFakeAuthAppDeps,
  createFakeSessionRepository,
} from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const REVIEW_ID = "00000000-0000-4000-8000-000000000001";
const OWNER_ID = "u-1"; // createFakeSessionRepository 로 만드는 세션의 userId와 맞춘다
const VALID_BODY = { rating: 4, content: "수정된 충분히 긴 리뷰 본문입니다" };

const buildOwnedRow = (
  overrides: Partial<IReviewOwnedRow> = {},
): IReviewOwnedRow => ({
  id: REVIEW_ID,
  officeId: "office-1",
  userId: OWNER_ID,
  rating: 5,
  content: "원래 리뷰 본문입니다 충분히 깁니다",
  createdAt: new Date("2026-08-20T00:00:00.000Z"),
  hiddenAt: null,
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  photos: [],
  helpfulCount: 0,
  isHelpful: false,
  ...overrides,
});

const buildApp = (
  reviewRepositoryOverrides: Partial<
    ReturnType<typeof createFakeReviewRepository>
  > = {},
) => {
  const sessionRepository = createFakeSessionRepository();
  const reviewRepository = {
    ...createFakeReviewRepository(),
    ...reviewRepositoryOverrides,
  };
  const app = createApp({
    ...createFakeAuthAppDeps(),
    sessionRepository,
    officeRepository: createFakeOfficeRepository(),
    reviewRepository,
  });
  return { app, sessionRepository, reviewRepository };
};

const withSession = async (
  sessionRepository: ReturnType<typeof createFakeSessionRepository>,
  userId: string = OWNER_ID,
) => {
  await sessionRepository.create({
    id: "sess-1",
    userId,
    expiresAt: new Date(Date.now() + 60_000),
  });
  return { Cookie: "session_id=sess-1" };
};

describe("PATCH /api/reviews/:id", () => {
  it("AC8: 세션 쿠키 없이 요청하면 401", async () => {
    const { app } = buildApp();

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(401);
  });

  it("AC9: 존재하지 않는 리뷰면 404", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => null,
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(404);
  });

  it("AC10: 본인 리뷰가 아니면 403", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow({ userId: "other-user" }),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(403);
  });

  it("AC11: rating이 범위 밖이면 400", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow(),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, rating: 0 }),
    });

    expect(res.status).toBe(400);
  });

  it("AC12: 본인 리뷰면 200과 갱신된 리뷰를 반환한다", async () => {
    const { app, sessionRepository, reviewRepository } = buildApp({
      findById: async () => buildOwnedRow(),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(res.status).toBe(200);
    const parsed = reviewSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.rating).toBe(VALID_BODY.rating);
    expect(reviewRepository.update).toHaveBeenCalledWith(REVIEW_ID, {
      rating: VALID_BODY.rating,
      content: VALID_BODY.content,
      dealType: null,
      dealResult: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });
  });

  it("AC9(review-deal-and-visit-fields): dealType이 허용값이 아니면 400", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow(),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, dealType: "옥탑방" }),
    });

    expect(res.status).toBe(400);
  });

  it("AC9(review-deal-and-visit-fields): 거래정보를 채워 보내면 repository.update에 그대로 전달된다(전체교체)", async () => {
    const { app, sessionRepository, reviewRepository } = buildApp({
      findById: async () => buildOwnedRow(),
    });
    const headers = await withSession(sessionRepository);

    await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...VALID_BODY,
        dealType: "전세",
        dealResult: "계약함",
        visitedYear: 2026,
        visitedMonth: 3,
      }),
    });

    expect(reviewRepository.update).toHaveBeenCalledWith(REVIEW_ID, {
      rating: VALID_BODY.rating,
      content: VALID_BODY.content,
      dealType: "전세",
      dealResult: "계약함",
      visitedYear: 2026,
      visitedMonth: 3,
      tags: [],
      photoKeys: [],
    });
  });
});

describe("DELETE /api/reviews/:id", () => {
  it("AC8: 세션 쿠키 없이 요청하면 401", async () => {
    const { app } = buildApp();

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(401);
  });

  it("AC9: 존재하지 않는 리뷰면 404", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => null,
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "DELETE",
      headers,
    });

    expect(res.status).toBe(404);
  });

  it("AC10: 본인 리뷰가 아니면 403이고 삭제하지 않는다", async () => {
    const { app, sessionRepository, reviewRepository } = buildApp({
      findById: async () => buildOwnedRow({ userId: "other-user" }),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "DELETE",
      headers,
    });

    expect(res.status).toBe(403);
    expect(reviewRepository.deleteById).not.toHaveBeenCalled();
  });

  it("AC13: 본인 리뷰면 204를 반환하고 삭제한다", async () => {
    const { app, sessionRepository, reviewRepository } = buildApp({
      findById: async () => buildOwnedRow(),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "DELETE",
      headers,
    });

    expect(res.status).toBe(204);
    expect(reviewRepository.deleteById).toHaveBeenCalledWith(REVIEW_ID);
  });
});

describe("POST /api/reviews/:id/report", () => {
  it("AC14: 세션 쿠키 없이 요청하면 401", async () => {
    const { app } = buildApp();

    const res = await app.request(`/api/reviews/${REVIEW_ID}/report`, {
      method: "POST",
    });

    expect(res.status).toBe(401);
  });

  it("AC15: 존재하지 않는 리뷰면 404", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => null,
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}/report`, {
      method: "POST",
      headers,
    });

    expect(res.status).toBe(404);
  });

  it("AC16: 본인 리뷰를 신고하면 400", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow({ userId: OWNER_ID }),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}/report`, {
      method: "POST",
      headers,
    });

    expect(res.status).toBe(400);
  });

  it("AC17: 이미 신고한 리뷰면 409", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow({ userId: "author" }),
      insertReport: async () => {
        throw { code: "23505" };
      },
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}/report`, {
      method: "POST",
      headers,
    });

    expect(res.status).toBe(409);
  });

  it("정상 신고면 204를 반환한다", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow({ userId: "author" }),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}/report`, {
      method: "POST",
      headers,
    });

    expect(res.status).toBe(204);
  });
});

describe("PATCH /api/reviews/:id — 태그 (review-tags)", () => {
  it("AC6: tags를 생략하면 기존 태그가 있었어도 전부 삭제된다(전체교체)", async () => {
    const { app, sessionRepository, reviewRepository } = buildApp({
      findById: async () => buildOwnedRow({ tags: ["친절함", "응답 빠름"] }),
    });
    const headers = await withSession(sessionRepository);

    await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });

    expect(reviewRepository.update).toHaveBeenCalledWith(
      REVIEW_ID,
      expect.objectContaining({ tags: [] }),
    );
  });

  it("화이트리스트 밖 태그면 400", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow(),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BODY, tags: ["없는태그"] }),
    });

    expect(res.status).toBe(400);
  });

  it("AC7(review-profanity-filter): 본문에 비속어가 있으면 422이고 repository.update를 호출하지 않는다", async () => {
    const { app, sessionRepository, reviewRepository } = buildApp({
      findById: async () => buildOwnedRow(),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...VALID_BODY,
        content: "수정된 리뷰인데 씨발 이렇게 바꿉니다",
      }),
    });

    expect(res.status).toBe(422);
    expect(reviewRepository.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/reviews/:id/helpful (review-helpful-toggle)", () => {
  it("AC4: 세션 쿠키 없이 요청하면 401", async () => {
    const { app } = buildApp();

    const res = await app.request(`/api/reviews/${REVIEW_ID}/helpful`, {
      method: "POST",
    });

    expect(res.status).toBe(401);
  });

  it("AC5: 존재하지 않는 리뷰면 404", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => null,
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}/helpful`, {
      method: "POST",
      headers,
    });

    expect(res.status).toBe(404);
  });

  it("AC6: 처음 누르면 isHelpful: true와 늘어난 helpfulCount를 반환한다", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow(),
      toggleHelpful: async () => ({ helpfulCount: 1, isHelpful: true }),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}/helpful`, {
      method: "POST",
      headers,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ helpfulCount: 1, isHelpful: true });
  });

  it("AC7: 다시 누르면(토글 취소) isHelpful: false와 줄어든 helpfulCount를 반환한다", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow(),
      toggleHelpful: async () => ({ helpfulCount: 0, isHelpful: false }),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}/helpful`, {
      method: "POST",
      headers,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ helpfulCount: 0, isHelpful: false });
  });

  it("AC8: 본인이 쓴 리뷰에도 도움돼요를 누를 수 있다(403이 아니다)", async () => {
    const { app, sessionRepository } = buildApp({
      findById: async () => buildOwnedRow({ userId: OWNER_ID }),
      toggleHelpful: async () => ({ helpfulCount: 1, isHelpful: true }),
    });
    const headers = await withSession(sessionRepository);

    const res = await app.request(`/api/reviews/${REVIEW_ID}/helpful`, {
      method: "POST",
      headers,
    });

    expect(res.status).toBe(200);
  });
});
