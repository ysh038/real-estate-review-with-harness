import type { TBbox } from "@repo/types";
import { describe, expect, it } from "vitest";

import {
  MAX_OFFICES_PER_BBOX,
  TOP_TAGS_PER_OFFICE,
  createOfficeService,
  type TOfficeSummaryRow,
} from "../../services/officeService";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";

const SEOUL_BBOX: TBbox = {
  minLng: 127.0,
  minLat: 37.3,
  maxLng: 127.2,
  maxLat: 37.5,
};

const buildOffice = (id: string): TOfficeSummaryRow => ({
  id,
  name: `사무소 ${id}`,
  ownerName: "홍길동",
  address: "경기도 성남시 분당구",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
  matchConfidence: null,
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

  it("AC10(review-tags): 잘린 뒤 남은 사무소 id로만 태그 집계를 상위 N개 제한으로 요청한다", async () => {
    const rows = [buildOffice("a"), buildOffice("b")];
    const repository = createFakeOfficeRepository(rows);
    const service = createOfficeService(repository);

    await service.findByBbox(SEOUL_BBOX);

    expect(repository.findTopTagCountsByOfficeIds).toHaveBeenCalledWith(
      ["a", "b"],
      TOP_TAGS_PER_OFFICE,
    );
  });

  it("AC10: 태그 집계 결과를 각 사무소의 tagCounts로 합성한다", async () => {
    const rows = [buildOffice("a"), buildOffice("b")];
    const repository = createFakeOfficeRepository(rows, [], [
      { tag: "친절함", count: 3 },
    ]);
    const service = createOfficeService(repository);

    const result = await service.findByBbox(SEOUL_BBOX);

    expect(result.offices[0]?.tagCounts).toEqual([{ tag: "친절함", count: 3 }]);
    expect(result.offices[1]?.tagCounts).toEqual([{ tag: "친절함", count: 3 }]);
  });

  it("AC11: 태그 집계가 없는 사무소는 tagCounts가 빈 배열이다", async () => {
    const repository = createFakeOfficeRepository([buildOffice("a")]);
    const service = createOfficeService(repository);

    const result = await service.findByBbox(SEOUL_BBOX);

    expect(result.offices[0]?.tagCounts).toEqual([]);
  });
});
