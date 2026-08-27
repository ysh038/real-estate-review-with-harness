import {
  officeDetailResponseSchema,
  reviewListResponseSchema,
  REVIEW_PAGE_SIZE_MAX,
  type TTagCount,
} from "@repo/types";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app";
import { encodeCursor } from "../../lib/cursor";
import type { TOfficeSummaryRow } from "../../services/officeService";
import type { IReviewListRow } from "../../services/reviewService";
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
  matchConfidence: null,
};

const buildReviewRow = (index: number): IReviewListRow => ({
  id: `0000000${index}-1111-4222-8333-444455556666`,
  officeId: OFFICE.id,
  rating: 5,
  content: "열 자를 넘기는 충분한 길이의 리뷰 본문입니다",
  nickname: `사용자${index}`,
  profileImageUrl: null,
  createdAt: new Date(`2026-08-${10 + index}T00:00:00.000Z`),
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  photos: [],
  helpfulCount: 0,
  isHelpful: null,
});

const buildApp = ({
  office = OFFICE as TOfficeSummaryRow | null,
  ratings = [] as number[],
  reviewRows = [] as IReviewListRow[],
  tagCounts = [] as TTagCount[],
} = {}) => {
  const officeRepository = {
    ...createFakeOfficeRepository(office ? [office] : [], ratings, tagCounts),
    findById: vi.fn(async () => office),
    findVisibleRatingsByOfficeId: vi.fn(async () => ratings),
    findTagCountsByOfficeId: vi.fn(async () => tagCounts),
  };
  const reviewRepository = createFakeReviewRepository(reviewRows);
  const sessionRepository = createFakeSessionRepository();
  const app = createApp({
    officeRepository,
    reviewRepository,
    ...createFakeAuthAppDeps(),
    sessionRepository,
  });
  return { app, reviewRepository, sessionRepository };
};

// createFakeUserRepository의 기본 사용자 id("u-1")와 맞춘다 — 그래야 세션이 실제
// 로그인 상태로 해석된다.
const withSession = async (
  sessionRepository: ReturnType<typeof createFakeSessionRepository>,
  userId = "u-1",
) => {
  await sessionRepository.create({
    id: "sess-1",
    userId,
    expiresAt: new Date(Date.now() + 60_000),
  });
  return { Cookie: "session_id=sess-1" };
};

describe("GET /api/offices/:id", () => {
  it("AC13: 200 과 계약 스키마에 맞는 본문을 반환한다", async () => {
    const { app } = buildApp({ ratings: [5, 4, 4] });

    const res = await app.request(`/api/offices/${OFFICE.id}`);

    expect(res.status).toBe(200);
    const parsed = officeDetailResponseSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.avgRating).toBe(4.3);
    expect(parsed.success && parsed.data.reviewCount).toBe(3);
  });

  it("AC14: 없는 사무소 id 면 404 를 반환한다", async () => {
    const { app } = buildApp({ office: null });

    const res = await app.request("/api/offices/does-not-exist");

    expect(res.status).toBe(404);
  });
});

describe("GET /api/offices/:id/reviews", () => {
  it("AC15: 200 과 계약 스키마에 맞는 본문을 반환한다", async () => {
    const { app } = buildApp({ reviewRows: [buildReviewRow(1)] });

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`);

    expect(res.status).toBe(200);
    const parsed = reviewListResponseSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
  });

  it("AC16: 각 항목에 작성자 닉네임이 포함된다", async () => {
    const { app } = buildApp({ reviewRows: [buildReviewRow(1)] });

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`);
    const body = reviewListResponseSchema.parse(await res.json());

    expect(body.reviews[0]?.author.nickname).toBe("사용자1");
  });

  it("AC19: limit 이 상한을 넘으면 400 을 반환한다", async () => {
    const { app } = buildApp();

    const res = await app.request(
      `/api/offices/${OFFICE.id}/reviews?limit=${REVIEW_PAGE_SIZE_MAX + 1}`,
    );

    expect(res.status).toBe(400);
  });

  it("AC19: limit 이 숫자가 아니면 400 을 반환한다", async () => {
    const { app } = buildApp();

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews?limit=abc`);

    expect(res.status).toBe(400);
  });

  it("AC12: 잘못된 커서면 400 을 반환한다", async () => {
    const { app } = buildApp();

    const res = await app.request(
      `/api/offices/${OFFICE.id}/reviews?cursor=broken-cursor`,
    );

    expect(res.status).toBe(400);
  });

  it("AC12: 올바른 커서면 200 을 반환한다", async () => {
    const { app } = buildApp({ reviewRows: [buildReviewRow(1)] });
    const cursor = encodeCursor({ createdAt: new Date(), id: OFFICE.id });

    const res = await app.request(
      `/api/offices/${OFFICE.id}/reviews?cursor=${cursor}`,
    );

    expect(res.status).toBe(200);
  });

  it("AC1(review-permalink-report-and-sort): sort=oldest를 넘기면 repository에 그대로 전달된다", async () => {
    const { app, reviewRepository } = buildApp({ reviewRows: [buildReviewRow(1)] });

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews?sort=oldest`);

    expect(res.status).toBe(200);
    expect(reviewRepository.findByOfficeId).toHaveBeenCalledWith(
      OFFICE.id,
      expect.any(Number),
      undefined,
      null,
      "oldest",
    );
  });

  it("AC1(review-permalink-report-and-sort): sort에 허용되지 않는 값이면 400", async () => {
    const { app } = buildApp();

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews?sort=bogus`);

    expect(res.status).toBe(400);
  });

  it("AC8(review-tags): 각 항목에 tags가 포함된다", async () => {
    const { app } = buildApp({
      reviewRows: [{ ...buildReviewRow(1), tags: ["친절함", "응답 빠름"] }],
    });

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`);
    const body = reviewListResponseSchema.parse(await res.json());

    expect(body.reviews[0]?.tags).toEqual(["친절함", "응답 빠름"]);
  });
});

describe("GET /api/offices/:id/reviews — 도움돼요 (review-helpful-toggle)", () => {
  it("AC9: 각 항목에 helpfulCount가 그대로 반영된다", async () => {
    const { app } = buildApp({
      reviewRows: [{ ...buildReviewRow(1), helpfulCount: 3 }],
    });

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`);
    const body = reviewListResponseSchema.parse(await res.json());

    expect(body.reviews[0]?.helpfulCount).toBe(3);
  });

  it("AC10: 로그인한 뷰어면 그 사용자 id를 repository에 requestingUserId로 전달한다", async () => {
    const { app, reviewRepository, sessionRepository } = buildApp({
      reviewRows: [buildReviewRow(1)],
    });
    const headers = await withSession(sessionRepository);

    await app.request(`/api/offices/${OFFICE.id}/reviews`, { headers });

    expect(reviewRepository.findByOfficeId).toHaveBeenCalledWith(
      OFFICE.id,
      expect.any(Number),
      undefined,
      "u-1",
      "latest",
    );
  });

  it("AC11: 비로그인이면 requestingUserId 없이 repository를 호출하고 isHelpful은 null이다", async () => {
    const { app, reviewRepository } = buildApp({
      reviewRows: [buildReviewRow(1)],
    });

    const res = await app.request(`/api/offices/${OFFICE.id}/reviews`);
    const body = reviewListResponseSchema.parse(await res.json());

    expect(reviewRepository.findByOfficeId).toHaveBeenCalledWith(
      OFFICE.id,
      expect.any(Number),
      undefined,
      null,
      "latest",
    );
    expect(body.reviews[0]?.isHelpful).toBeNull();
  });
});

describe("GET /api/offices/:id — 태그 집계 (review-tags)", () => {
  it("AC9: tagCounts가 응답에 포함된다", async () => {
    const { app } = buildApp({
      tagCounts: [
        { tag: "친절함", count: 3 },
        { tag: "응답 빠름", count: 1 },
      ],
    });

    const res = await app.request(`/api/offices/${OFFICE.id}`);
    const body = officeDetailResponseSchema.parse(await res.json());

    expect(body.tagCounts).toEqual([
      { tag: "친절함", count: 3 },
      { tag: "응답 빠름", count: 1 },
    ]);
  });

  it("AC11: 태그가 없으면 tagCounts는 빈 배열이다", async () => {
    const { app } = buildApp();

    const res = await app.request(`/api/offices/${OFFICE.id}`);
    const body = officeDetailResponseSchema.parse(await res.json());

    expect(body.tagCounts).toEqual([]);
  });
});
