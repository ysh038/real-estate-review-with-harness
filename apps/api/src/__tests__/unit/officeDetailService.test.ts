import type { TTagCount } from "@repo/types";
import { describe, expect, it, vi } from "vitest";

import {
  createOfficeDetailService,
  type IOfficeDetailRepository,
  type TOfficeSummaryRow,
} from "../../services/officeService";

const OFFICE: TOfficeSummaryRow = {
  id: "office-1",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
  matchConfidence: null,
};

const createFakeRepository = (
  office: TOfficeSummaryRow | null,
  ratings: number[],
  tagCounts: TTagCount[] = [],
): IOfficeDetailRepository => ({
  findById: vi.fn(async () => office),
  findVisibleRatingsByOfficeId: vi.fn(async () => ratings),
  findTagCountsByOfficeId: vi.fn(async () => tagCounts),
});

describe("officeDetailService.findDetailById", () => {
  it("AC7: 리뷰가 0건이면 reviewCount 0, avgRating null 을 반환한다", async () => {
    const service = createOfficeDetailService(createFakeRepository(OFFICE, []));

    const result = await service.findDetailById("office-1");

    expect(result).toMatchObject({ reviewCount: 0, avgRating: null });
  });

  it("AC8: avgRating 을 소수 첫째 자리까지 반올림한다", async () => {
    // 5, 4, 4 → 4.333... → 4.3
    const service = createOfficeDetailService(
      createFakeRepository(OFFICE, [5, 4, 4]),
    );

    const result = await service.findDetailById("office-1");

    expect(result?.avgRating).toBe(4.3);
    expect(result?.reviewCount).toBe(3);
  });

  it("AC8: 반올림이 올림 방향으로도 정확하다", async () => {
    // 5, 5, 4 → 4.666... → 4.7
    const service = createOfficeDetailService(
      createFakeRepository(OFFICE, [5, 5, 4]),
    );

    expect((await service.findDetailById("office-1"))?.avgRating).toBe(4.7);
  });

  it("AC13: 사무소 정보를 그대로 함께 반환한다", async () => {
    const service = createOfficeDetailService(createFakeRepository(OFFICE, [5]));

    const result = await service.findDetailById("office-1");

    expect(result).toMatchObject({ id: OFFICE.id, name: OFFICE.name });
  });

  it("AC14: 없는 사무소면 null 을 반환한다", async () => {
    const service = createOfficeDetailService(createFakeRepository(null, []));

    expect(await service.findDetailById("nope")).toBeNull();
  });
});
