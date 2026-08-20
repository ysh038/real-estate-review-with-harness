import type { TBbox, TOfficeSummary } from "@repo/types";
import { vi } from "vitest";

import type {
  IOfficeDetailRepository,
  IOfficeRepository,
} from "../../services/officeService";

/**
 * bbox 필터링은 하지 않는다 — 그건 repository의 SQL이 하는 일이고
 * 여기서 흉내내면 mock이 시킨 대로 답하는지만 확인하게 된다 (40-testing).
 * 이 fake는 "몇 건을, 어떤 limit으로 요청받았는가"만 검증하기 위한 것이다.
 */
export const createFakeOfficeRepository = (
  rows: TOfficeSummary[] = [],
  ratings: number[] = [],
): IOfficeRepository & IOfficeDetailRepository => ({
  findByBbox: vi.fn(async (_bbox: TBbox, limit: number) => rows.slice(0, limit)),
  findById: vi.fn(async (id: string) => rows.find((row) => row.id === id) ?? null),
  findVisibleRatingsByOfficeId: vi.fn(async () => ratings),
});
