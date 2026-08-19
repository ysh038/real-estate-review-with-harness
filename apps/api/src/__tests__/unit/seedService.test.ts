import { describe, expect, it, vi } from "vitest";

import type { TOfficeInsert } from "../../db/schema";
import type { TGyeonggiRawRow } from "../../lib/gyeonggiClient";
import { createSeedService, normalizeOfficeRow } from "../../services/seedService";

const buildRow = (overrides: Partial<TGyeonggiRawRow> = {}): TGyeonggiRawRow => ({
  COPRTN_REG_NO: "41135-2020-00001",
  BIZMAN_CMPNM_INFO: "분당공인중개사사무소",
  BRKR_NM: "홍길동",
  REFINE_LOTNO_ADDR: "경기도 성남시 분당구 판교로 1",
  TELNO_INFO: "031-000-0000",
  SIGUN_NM: "성남시",
  ...overrides,
});

const buildGyeonggiClient = (rows: TGyeonggiRawRow[]) => ({
  fetchAllBySigungu: vi.fn(async () => rows),
});

const buildKakaoGeocoder = (
  resolver: (address: string) => { lat: number; lng: number } | null,
) => ({
  geocodeAddress: vi.fn(async (address: string) => resolver(address)),
});

const buildOfficeRepository = () => {
  const inserted: TOfficeInsert[] = [];
  return {
    findByBbox: vi.fn(async () => []),
    upsertMany: vi.fn(async (rows: TOfficeInsert[]) => {
      inserted.push(...rows);
      return rows.length;
    }),
    inserted,
  };
};

describe("normalizeOfficeRow", () => {
  it("AC1: 원천 필드를 정규화된 사무소 레코드로 변환한다", () => {
    const result = normalizeOfficeRow(buildRow(), "성남시");

    expect(result).toEqual({
      id: "41135-2020-00001",
      name: "분당공인중개사사무소",
      ownerName: "홍길동",
      address: "경기도 성남시 분당구 판교로 1",
      phone: "031-000-0000",
      sigungu: "성남시",
    });
  });

  it("AC3: 대표자명이 빈 문자열이면 ownerName 은 null 이다", () => {
    const result = normalizeOfficeRow(buildRow({ BRKR_NM: "" }), "성남시");

    expect(result?.ownerName).toBeNull();
  });

  it("등록번호가 없으면 사무소명-주소 조합을 id 로 쓴다", () => {
    const result = normalizeOfficeRow(
      buildRow({ COPRTN_REG_NO: undefined }),
      "성남시",
    );

    expect(result?.id).toBe("분당공인중개사사무소-경기도 성남시 분당구 판교로 1");
  });

  it("사무소명이 없으면 null 을 반환한다 (시딩 불가 레코드)", () => {
    expect(normalizeOfficeRow(buildRow({ BIZMAN_CMPNM_INFO: "" }), "성남시")).toBeNull();
  });
});

describe("seedService.seedSigungu", () => {
  it("AC1: 지오코딩 성공 시 좌표가 붙은 레코드를 upsert 한다", async () => {
    const gyeonggiClient = buildGyeonggiClient([buildRow()]);
    const kakaoGeocoder = buildKakaoGeocoder(() => ({ lat: 37.4, lng: 127.1 }));
    const officeRepository = buildOfficeRepository();
    const service = createSeedService({ gyeonggiClient, kakaoGeocoder, officeRepository });

    const summary = await service.seedSigungu("성남시");

    expect(officeRepository.inserted).toEqual([
      {
        id: "41135-2020-00001",
        name: "분당공인중개사사무소",
        ownerName: "홍길동",
        address: "경기도 성남시 분당구 판교로 1",
        phone: "031-000-0000",
        sigungu: "성남시",
        lat: 37.4,
        lng: 127.1,
      },
    ]);
    expect(summary).toEqual({ fetched: 1, upserted: 1, skipped: 0 });
  });

  it("AC2: 지오코딩 실패한 레코드는 건너뛰고 나머지는 계속 처리한다", async () => {
    const rows = [
      buildRow({ COPRTN_REG_NO: "A", REFINE_LOTNO_ADDR: "실패주소" }),
      buildRow({ COPRTN_REG_NO: "B", REFINE_LOTNO_ADDR: "성공주소" }),
    ];
    const gyeonggiClient = buildGyeonggiClient(rows);
    const kakaoGeocoder = buildKakaoGeocoder((address) =>
      address === "성공주소" ? { lat: 37.4, lng: 127.1 } : null,
    );
    const officeRepository = buildOfficeRepository();
    const service = createSeedService({ gyeonggiClient, kakaoGeocoder, officeRepository });

    const summary = await service.seedSigungu("성남시");

    expect(officeRepository.inserted.map((row) => row.id)).toEqual(["B"]);
    expect(summary).toEqual({ fetched: 2, upserted: 1, skipped: 1 });
  });

  it("AC4: 같은 등록번호가 중복으로 오면 1건으로 합쳐진다", async () => {
    const rows = [
      buildRow({ COPRTN_REG_NO: "DUP", TELNO_INFO: "031-111-1111" }),
      buildRow({ COPRTN_REG_NO: "DUP", TELNO_INFO: "031-222-2222" }),
    ];
    const gyeonggiClient = buildGyeonggiClient(rows);
    const kakaoGeocoder = buildKakaoGeocoder(() => ({ lat: 37.4, lng: 127.1 }));
    const officeRepository = buildOfficeRepository();
    const service = createSeedService({ gyeonggiClient, kakaoGeocoder, officeRepository });

    const summary = await service.seedSigungu("성남시");

    expect(officeRepository.inserted).toHaveLength(1);
    expect(officeRepository.inserted[0]?.phone).toBe("031-222-2222");
    expect(summary).toEqual({ fetched: 2, upserted: 1, skipped: 0 });
  });

  it("AC5: 실행 결과 요약을 반환한다 (빈 목록)", async () => {
    const gyeonggiClient = buildGyeonggiClient([]);
    const kakaoGeocoder = buildKakaoGeocoder(() => null);
    const officeRepository = buildOfficeRepository();
    const service = createSeedService({ gyeonggiClient, kakaoGeocoder, officeRepository });

    const summary = await service.seedSigungu("성남시");

    expect(summary).toEqual({ fetched: 0, upserted: 0, skipped: 0 });
  });

  it("AC6: 경기데이터드림 API 가 실패하면 에러를 던지고 종료한다", async () => {
    const gyeonggiClient = {
      fetchAllBySigungu: vi.fn(async () => {
        throw new Error("Gyeonggi OpenAPI ERROR-310: 필수 파라미터 누락");
      }),
    };
    const kakaoGeocoder = buildKakaoGeocoder(() => ({ lat: 0, lng: 0 }));
    const officeRepository = buildOfficeRepository();
    const service = createSeedService({ gyeonggiClient, kakaoGeocoder, officeRepository });

    await expect(service.seedSigungu("성남시")).rejects.toThrow("ERROR-310");
    expect(officeRepository.upsertMany).not.toHaveBeenCalled();
  });
});
