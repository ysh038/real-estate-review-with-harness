import { vi } from "vitest";

import type {
  IReviewRepository,
  IReviewListRow,
} from "../../services/reviewService";

/**
 * 커서 필터링·정렬은 흉내내지 않는다 — 그건 repository 의 SQL 이 하는 일이고,
 * 여기서 재구현하면 mock 이 시킨 대로 답하는지만 확인하게 된다 (40-testing).
 * 이 fake 는 "어떤 인자로 몇 건을 요청받았는가"와 응답 매핑만 검증하기 위한 것이다.
 */
export const createFakeReviewRepository = (
  rows: IReviewListRow[] = [],
): IReviewRepository => ({
  findByOfficeId: vi.fn(async (_officeId, limit) => rows.slice(0, limit)),
});
