import { vi } from "vitest";

import type {
  IMyReviewRow,
  IReviewListRow,
  IReviewOwnedRow,
  IReviewWriteRepository,
} from "../../services/reviewService";

/**
 * 커서 필터링·정렬·소유권 확인은 흉내내지 않는다 — 그건 repository 의 SQL 이 하는 일이고,
 * 여기서 재구현하면 mock 이 시킨 대로 답하는지만 확인하게 된다 (40-testing).
 * 이 fake 는 "어떤 인자로 몇 건을 요청받았는가"와 응답 매핑만 검증하기 위한 것이다.
 * 소유권·중복·rate limit 케이스는 각 테스트가 개별 메서드를 override해서 쓴다.
 */
export const createFakeReviewRepository = (
  rows: IReviewListRow[] = [],
  myReviewRows: IMyReviewRow[] = [],
): IReviewWriteRepository => ({
  findByOfficeId: vi.fn(async (_officeId, limit) => rows.slice(0, limit)),
  insert: vi.fn(
    async (row): Promise<IReviewOwnedRow> => ({
      id: "00000000-0000-4000-8000-000000000001",
      officeId: row.officeId,
      userId: row.userId,
      rating: row.rating,
      content: row.content,
      createdAt: new Date(),
      dealType: row.dealType,
      dealResult: row.dealResult,
      visitedYear: row.visitedYear,
      visitedMonth: row.visitedMonth,
      tags: row.tags,
      helpfulCount: 0,
      isHelpful: false,
    }),
  ),
  findById: vi.fn(async () => null),
  update: vi.fn(
    async (id, patch): Promise<IReviewOwnedRow> => ({
      id,
      officeId: "fake-office-id",
      userId: "fake-user-id",
      rating: patch.rating,
      content: patch.content,
      createdAt: new Date(),
      dealType: patch.dealType,
      dealResult: patch.dealResult,
      visitedYear: patch.visitedYear,
      visitedMonth: patch.visitedMonth,
      tags: patch.tags,
      helpfulCount: 0,
      isHelpful: false,
    }),
  ),
  deleteById: vi.fn(async () => {}),
  hasRecentReviewFromIp: vi.fn(async () => false),
  insertReport: vi.fn(async () => {}),
  hideIfThresholdReached: vi.fn(async () => {}),
  toggleHelpful: vi.fn(async () => ({ helpfulCount: 1, isHelpful: true })),
  findByUserId: vi.fn(async (_userId, limit) => myReviewRows.slice(0, limit)),
});
