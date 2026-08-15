import type { TBbox, TOfficeSummary } from "@repo/types";
import { and, gte, lte, sql } from "drizzle-orm";

import type { TDatabase } from "../db/client";
import { offices, type TOfficeInsert } from "../db/schema";
import type { IOfficeRepository } from "../services/officeService";

export interface IOfficeWriteRepository extends IOfficeRepository {
  upsertMany: (rows: TOfficeInsert[]) => Promise<number>;
}

export const createOfficeRepository = (
  db: TDatabase,
): IOfficeWriteRepository => ({
  findByBbox: async (bbox: TBbox, limit: number): Promise<TOfficeSummary[]> =>
    db
      .select({
        id: offices.id,
        name: offices.name,
        ownerName: offices.ownerName,
        address: offices.address,
        phone: offices.phone,
        sigungu: offices.sigungu,
        lat: offices.lat,
        lng: offices.lng,
      })
      .from(offices)
      // 경계선 위의 좌표는 포함한다 (gte/lte) — 인접 bbox 사이에서 마커가 사라지면 안 된다.
      .where(
        and(
          gte(offices.lat, bbox.minLat),
          lte(offices.lat, bbox.maxLat),
          gte(offices.lng, bbox.minLng),
          lte(offices.lng, bbox.maxLng),
        ),
      )
      .limit(limit),

  /** 재시딩은 멱등이어야 한다 — 같은 등록번호는 갱신하고 행을 늘리지 않는다. */
  upsertMany: async (rows: TOfficeInsert[]): Promise<number> => {
    if (rows.length === 0) return 0;

    await db
      .insert(offices)
      .values(rows)
      .onConflictDoUpdate({
        target: offices.id,
        set: {
          name: sql`excluded.name`,
          ownerName: sql`excluded.owner_name`,
          address: sql`excluded.address`,
          phone: sql`excluded.phone`,
          sigungu: sql`excluded.sigungu`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          updatedAt: sql`now()`,
        },
      });

    return rows.length;
  },
});
