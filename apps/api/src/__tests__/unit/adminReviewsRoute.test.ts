import {
  adminHiddenReviewListResponseSchema,
  reviewSchema,
} from "@repo/types";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app";
import type {
  IAdminHiddenReviewRow,
  IReviewOwnedRow,
} from "../../services/reviewService";
import { createFakeAuthAppDeps } from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const ADMIN_KEY = "test-admin-key";

const buildHiddenRow = (index: number): IAdminHiddenReviewRow => ({
  id: `0000000${index}-1111-4222-8333-444455556666`,
  officeId: "office-1",
  officeName: `사무소${index}`,
  rating: 1,
  content: "열 자를 넘기는 충분한 길이의 리뷰 본문입니다",
  nickname: `사용자${index}`,
  profileImageUrl: null,
  createdAt: new Date(`2026-08-${10 + index}T00:00:00.000Z`),
  hiddenAt: new Date(`2026-08-${15 + index}T00:00:00.000Z`),
  reportCount: 5,
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  photos: [],
  helpfulCount: 0,
  isHelpful: null,
});

const buildOwnedRow = (
  overrides: Partial<IReviewOwnedRow> = {},
): IReviewOwnedRow => ({
  id: "00000000-0000-4000-8000-000000000001",
  officeId: "office-1",
  userId: "u-1",
  rating: 1,
  content: "열 자를 넘기는 충분한 길이의 리뷰 본문입니다",
  createdAt: new Date("2026-08-20T00:00:00.000Z"),
  hiddenAt: new Date("2026-08-21T00:00:00.000Z"),
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

/**
 * adminApiKey는 기본값을 두지 않는다 — 구조분해 기본값은 "생략"과 "명시적 undefined"를
 * 구분하지 못해(둘 다 기본값을 적용) `{ adminApiKey: undefined }`로 "관리자 기능 꺼짐"을
 * 표현하려던 테스트가 조용히 ADMIN_KEY로 되돌아가는 버그를 만든다. 그래서 호출부가
 * 매번 명시적으로 값을 넘긴다.
 */
const buildApp = ({
  adminApiKey,
  hiddenRows = [] as IAdminHiddenReviewRow[],
  reviewRepositoryOverrides = {},
}: {
  adminApiKey: string | undefined;
  hiddenRows?: IAdminHiddenReviewRow[];
  reviewRepositoryOverrides?: Partial<
    ReturnType<typeof createFakeReviewRepository>
  >;
}) => {
  const reviewRepository = {
    ...createFakeReviewRepository([], [], hiddenRows),
    ...reviewRepositoryOverrides,
  };
  const app = createApp({
    ...createFakeAuthAppDeps(),
    adminApiKey,
    officeRepository: createFakeOfficeRepository(),
    reviewRepository,
  });
  return { app, reviewRepository };
};

describe("GET /api/admin/reviews/hidden", () => {
  it("AC2: ADMIN_API_KEY가 설정되지 않았으면 헤더가 있어도 503", async () => {
    const { app } = buildApp({ adminApiKey: undefined });

    const res = await app.request("/api/admin/reviews/hidden", {
      headers: { "x-admin-api-key": "any-value" },
    });

    expect(res.status).toBe(503);
  });

  it("AC3: 헤더가 없으면 403", async () => {
    const { app } = buildApp({ adminApiKey: ADMIN_KEY });

    const res = await app.request("/api/admin/reviews/hidden");

    expect(res.status).toBe(403);
  });

  it("AC3: 헤더 값이 다르면 403", async () => {
    const { app } = buildApp({ adminApiKey: ADMIN_KEY });

    const res = await app.request("/api/admin/reviews/hidden", {
      headers: { "x-admin-api-key": "wrong-value" },
    });

    expect(res.status).toBe(403);
  });

  it("AC4·AC7: 올바른 헤더면 통과하고, 숨김 리뷰가 없으면 빈 배열", async () => {
    const { app } = buildApp({ adminApiKey: ADMIN_KEY });

    const res = await app.request("/api/admin/reviews/hidden", {
      headers: { "x-admin-api-key": ADMIN_KEY },
    });

    expect(res.status).toBe(200);
    const body = adminHiddenReviewListResponseSchema.parse(await res.json());
    expect(body.reviews).toEqual([]);
  });

  it("AC5·AC6: 각 항목에 officeName·reportCount·hiddenAt이 포함된다", async () => {
    const { app } = buildApp({
      adminApiKey: ADMIN_KEY,
      hiddenRows: [buildHiddenRow(1)],
    });

    const res = await app.request("/api/admin/reviews/hidden", {
      headers: { "x-admin-api-key": ADMIN_KEY },
    });
    const body = adminHiddenReviewListResponseSchema.parse(await res.json());

    expect(body.reviews[0]?.officeName).toBe("사무소1");
    expect(body.reviews[0]?.reportCount).toBe(5);
    expect(body.reviews[0]?.hiddenAt).toBeTruthy();
  });

  it("AC8: limit보다 결과가 많으면 nextCursor를 함께 반환한다", async () => {
    const rows = [buildHiddenRow(1), buildHiddenRow(2), buildHiddenRow(3)];
    const { app } = buildApp({ adminApiKey: ADMIN_KEY, hiddenRows: rows });

    const res = await app.request("/api/admin/reviews/hidden?limit=2", {
      headers: { "x-admin-api-key": ADMIN_KEY },
    });
    const body = adminHiddenReviewListResponseSchema.parse(await res.json());

    expect(body.reviews).toHaveLength(2);
    expect(body.nextCursor).not.toBeNull();
  });

  it("잘못된 커서면 400을 반환한다", async () => {
    const { app } = buildApp({ adminApiKey: ADMIN_KEY });

    const res = await app.request(
      "/api/admin/reviews/hidden?cursor=broken",
      { headers: { "x-admin-api-key": ADMIN_KEY } },
    );

    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/reviews/:id/restore", () => {
  it("AC2: ADMIN_API_KEY가 설정되지 않았으면 503", async () => {
    const { app } = buildApp({ adminApiKey: undefined });

    const res = await app.request(
      "/api/admin/reviews/00000000-0000-4000-8000-000000000001/restore",
      { method: "POST" },
    );

    expect(res.status).toBe(503);
  });

  it("AC3: 헤더가 없으면 403", async () => {
    const { app } = buildApp({ adminApiKey: ADMIN_KEY });

    const res = await app.request(
      "/api/admin/reviews/00000000-0000-4000-8000-000000000001/restore",
      { method: "POST" },
    );

    expect(res.status).toBe(403);
  });

  it("AC9: 존재하지 않는 리뷰면 404", async () => {
    const { app } = buildApp({
      adminApiKey: ADMIN_KEY,
      reviewRepositoryOverrides: { findById: async () => null },
    });

    const res = await app.request(
      "/api/admin/reviews/no-such-review/restore",
      {
        method: "POST",
        headers: { "x-admin-api-key": ADMIN_KEY },
      },
    );

    expect(res.status).toBe(404);
  });

  it("AC10: 이미 노출 중인 리뷰면 409", async () => {
    const { app } = buildApp({
      adminApiKey: ADMIN_KEY,
      reviewRepositoryOverrides: {
        findById: async () => buildOwnedRow({ hiddenAt: null }),
      },
    });

    const res = await app.request(
      "/api/admin/reviews/00000000-0000-4000-8000-000000000001/restore",
      {
        method: "POST",
        headers: { "x-admin-api-key": ADMIN_KEY },
      },
    );

    expect(res.status).toBe(409);
  });

  it("AC11: 정상 복구되면 200과 갱신된 리뷰를 반환한다", async () => {
    const { app, reviewRepository } = buildApp({
      adminApiKey: ADMIN_KEY,
      reviewRepositoryOverrides: {
        findById: async () => buildOwnedRow(),
        restore: vi.fn(async () => ({
          id: "00000000-0000-4000-8000-000000000001",
          officeId: "office-1",
          rating: 1,
          content: "열 자를 넘기는 충분한 길이의 리뷰 본문입니다",
          nickname: "복구대상",
          profileImageUrl: null,
          createdAt: new Date("2026-08-20T00:00:00.000Z"),
          dealType: null,
          dealResult: null,
          visitedYear: null,
          visitedMonth: null,
          tags: [],
          photos: [],
          helpfulCount: 0,
          isHelpful: null,
        })),
      },
    });

    const res = await app.request(
      "/api/admin/reviews/00000000-0000-4000-8000-000000000001/restore",
      {
        method: "POST",
        headers: { "x-admin-api-key": ADMIN_KEY },
      },
    );

    expect(res.status).toBe(200);
    const parsed = reviewSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.author.nickname).toBe("복구대상");
    expect(reviewRepository.restore).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
    );
  });
});
