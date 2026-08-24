import type { TBbox, TTagCount } from "@repo/types";
import { vi } from "vitest";

import type {
  IOfficeDetailRepository,
  IOfficeRepository,
  TOfficeSummaryRow,
} from "../../services/officeService";

/**
 * bbox 필터링은 하지 않는다 — 그건 repository의 SQL이 하는 일이고
 * 여기서 흉내내면 mock이 시킨 대로 답하는지만 확인하게 된다 (40-testing).
 * 이 fake는 "몇 건을, 어떤 limit으로 요청받았는가"만 검증하기 위한 것이다.
 */
export const createFakeOfficeRepository = (
  rows: TOfficeSummaryRow[] = [],
  ratings: number[] = [],
  tagCounts: TTagCount[] = [],
): IOfficeRepository & IOfficeDetailRepository => ({
  findByBbox: vi.fn(async (_bbox: TBbox, limit: number) => rows.slice(0, limit)),
  findById: vi.fn(async (id: string) => rows.find((row) => row.id === id) ?? null),
  findVisibleRatingsByOfficeId: vi.fn(async () => ratings),
  findTagCountsByOfficeId: vi.fn(async () => tagCounts),
  findTopTagCountsByOfficeIds: vi.fn(async (officeIds: string[]) => {
    const map = new Map<string, TTagCount[]>();
    for (const id of officeIds) map.set(id, tagCounts);
    return map;
  }),
});
