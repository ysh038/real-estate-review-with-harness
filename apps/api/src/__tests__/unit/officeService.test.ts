import type { TBbox, TOfficeSummary } from "@repo/types";
import { describe, expect, it } from "vitest";

import {
  MAX_OFFICES_PER_BBOX,
  createOfficeService,
} from "../../services/officeService";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";

const SEOUL_BBOX: TBbox = {
  minLng: 127.0,
  minLat: 37.3,
  maxLng: 127.2,
  maxLat: 37.5,
};

const buildOffice = (id: string): TOfficeSummary => ({
  id,
  name: `사무소 ${id}`,
  ownerName: "홍길동",
  address: "경기도 성남시 분당구",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
});

describe("officeService.findByBbox", () => {
  it("AC4: 결과가 없으면 빈 배열을 반환한다", async () => {
    const service = createOfficeService(createFakeOfficeRepository([]));

    const result = await service.findByBbox(SEOUL_BBOX);

    expect(result.offices).toEqual([]);
    expect(result.isTruncated).toBe(false);
  });

  it("AC5: 상한을 넘으면 상한까지 자르고 isTruncated 를 세운다", async () => {
    const rows = Array.from({ length: MAX_OFFICES_PER_BBOX + 10 }, (_, index) =>
      buildOffice(String(index)),
    );
    const service = createOfficeService(createFakeOfficeRepository(rows));

    const result = await service.findByBbox(SEOUL_BBOX);

    expect(result.offices).toHaveLength(MAX_OFFICES_PER_BBOX);
    expect(result.isTruncated).toBe(true);
  });

  it("AC5: 상한과 정확히 같으면 자르지 않고 isTruncated 는 false 다", async () => {
    const rows = Array.from({ length: MAX_OFFICES_PER_BBOX }, (_, index) =>
      buildOffice(String(index)),
    );
    const repository = createFakeOfficeRepository(rows);
    const service = createOfficeService(repository);

    const result = await service.findByBbox(SEOUL_BBOX);

    expect(result.offices).toHaveLength(MAX_OFFICES_PER_BBOX);
    expect(result.isTruncated).toBe(false);
  });

  it("잘렸는지 알려면 상한보다 1건 더 요청해야 한다", async () => {
    const repository = createFakeOfficeRepository([]);
    const service = createOfficeService(repository);

    await service.findByBbox(SEOUL_BBOX);

    expect(repository.findByBbox).toHaveBeenCalledWith(
      SEOUL_BBOX,
      MAX_OFFICES_PER_BBOX + 1,
    );
  });
});
