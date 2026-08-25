import { myReviewListResponseSchema } from "@repo/types";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import type { IMyReviewRow } from "../../services/reviewService";
import {
  createFakeAuthAppDeps,
  createFakeSessionRepository,
} from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const buildMyReviewRow = (index: number): IMyReviewRow => ({
  id: `0000000${index}-1111-4222-8333-444455556666`,
  officeId: `office-${index}`,
  officeName: `사무소${index}`,
  rating: 5,
  content: "열 자를 넘기는 충분한 길이의 리뷰 본문입니다",
  createdAt: new Date(`2026-08-${10 + index}T00:00:00.000Z`),
  hiddenAt: null,
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  helpfulCount: 0,
  isHelpful: false,
});

const buildApp = (myReviewRows: IMyReviewRow[] = []) => {
  const sessionRepository = createFakeSessionRepository();
  const reviewRepository = createFakeReviewRepository([], myReviewRows);
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
) => {
  await sessionRepository.create({
    id: "sess-1",
    userId: "u-1",
    expiresAt: new Date(Date.now() + 60_000),
  });
  return { Cookie: "session_id=sess-1" };
};

describe("GET /api/me/reviews", () => {
  it("AC2: 세션 쿠키 없이 요청하면 401", async () => {
    const { app } = buildApp();

    const res = await app.request("/api/me/reviews");

    expect(res.status).toBe(401);
  });

  it("AC3: 로그인 상태면 200과 계약 스키마에 맞는 본문을 반환한다", async () => {
    const { app, sessionRepository } = buildApp([buildMyReviewRow(1)]);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/me/reviews", { headers });

    expect(res.status).toBe(200);
    const parsed = myReviewListResponseSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
  });

  it("AC4: 각 항목에 officeName이 포함된다", async () => {
    const { app, sessionRepository } = buildApp([buildMyReviewRow(1)]);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/me/reviews", { headers });
    const body = myReviewListResponseSchema.parse(await res.json());

    expect(body.reviews[0]?.officeName).toBe("사무소1");
  });

  it("AC5: 숨겨진 내 리뷰도 목록에 포함되고 isHidden: true로 표시된다", async () => {
    const hidden: IMyReviewRow = {
      ...buildMyReviewRow(1),
      hiddenAt: new Date("2026-08-15T00:00:00.000Z"),
    };
    const { app, sessionRepository } = buildApp([hidden]);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/me/reviews", { headers });
    const body = myReviewListResponseSchema.parse(await res.json());

    expect(body.reviews[0]?.isHidden).toBe(true);
  });

  it("AC6: 리뷰가 없으면 빈 배열을 반환한다", async () => {
    const { app, sessionRepository } = buildApp([]);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/me/reviews", { headers });
    const body = myReviewListResponseSchema.parse(await res.json());

    expect(body.reviews).toEqual([]);
  });

  it("AC7: limit보다 결과가 많으면 nextCursor를 함께 반환한다", async () => {
    const rows = [buildMyReviewRow(1), buildMyReviewRow(2), buildMyReviewRow(3)];
    const { app, sessionRepository } = buildApp(rows);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/me/reviews?limit=2", { headers });
    const body = myReviewListResponseSchema.parse(await res.json());

    expect(body.reviews).toHaveLength(2);
    expect(body.nextCursor).not.toBeNull();
  });

  it("잘못된 커서면 400을 반환한다", async () => {
    const { app, sessionRepository } = buildApp([]);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/me/reviews?cursor=broken", { headers });

    expect(res.status).toBe(400);
  });
});
