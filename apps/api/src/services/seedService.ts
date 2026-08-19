import type { TOfficeInsert } from "../db/schema";
import type { IGyeonggiClient, TGyeonggiRawRow } from "../lib/gyeonggiClient";
import type { IKakaoGeocoder } from "../lib/kakaoGeocoder";
import type { IOfficeWriteRepository } from "../repositories/officeRepository";

export interface INormalizedOfficeRow {
  id: string;
  name: string;
  ownerName: string | null;
  address: string;
  phone: string | null;
  sigungu: string;
}

export interface ISeedSummary {
  fetched: number;
  upserted: number;
  skipped: number;
}

export interface ISeedServiceDeps {
  gyeonggiClient: IGyeonggiClient;
  kakaoGeocoder: IKakaoGeocoder;
  officeRepository: IOfficeWriteRepository;
}

const pickField = (row: TGyeonggiRawRow, key: string): string | null => {
  const value = row[key];
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

/**
 * 사무소명·주소가 없으면 null — 이 레코드는 시딩할 수 없다.
 * 등록번호가 없으면 사무소명-주소 조합으로 대체 id를 만든다.
 */
export const normalizeOfficeRow = (
  row: TGyeonggiRawRow,
  sigungu: string,
): INormalizedOfficeRow | null => {
  const name = pickField(row, "BIZMAN_CMPNM_INFO");
  const address =
    pickField(row, "REFINE_LOTNO_ADDR") ?? pickField(row, "REFINE_ROADNM_ADDR");
  if (!name || !address) return null;

  return {
    id: pickField(row, "COPRTN_REG_NO") ?? `${name}-${address}`,
    name,
    ownerName: pickField(row, "BRKR_NM"),
    address,
    phone: pickField(row, "TELNO_INFO"),
    sigungu,
  };
};

export const createSeedService = (deps: ISeedServiceDeps) => ({
  seedSigungu: async (sigungu: string): Promise<ISeedSummary> => {
    const rawRows = await deps.gyeonggiClient.fetchAllBySigungu(sigungu);

    // 페이지네이션이 겹치면 같은 등록번호가 두 번 올 수 있다 — id 기준으로 합친다.
    // 나중에 온 값으로 덮어써 최신 페이지 내용을 우선한다.
    const normalizedById = new Map<string, INormalizedOfficeRow>();
    let skipped = 0;
    for (const row of rawRows) {
      const normalized = normalizeOfficeRow(row, sigungu);
      if (!normalized) {
        skipped += 1;
        continue;
      }
      normalizedById.set(normalized.id, normalized);
    }

    const inserts: TOfficeInsert[] = [];
    for (const row of normalizedById.values()) {
      const point = await deps.kakaoGeocoder.geocodeAddress(row.address);
      if (!point) {
        skipped += 1;
        continue;
      }
      inserts.push({ ...row, lat: point.lat, lng: point.lng });
    }

    const upserted = await deps.officeRepository.upsertMany(inserts);

    return { fetched: rawRows.length, upserted, skipped };
  },
});

export type TSeedService = ReturnType<typeof createSeedService>;
