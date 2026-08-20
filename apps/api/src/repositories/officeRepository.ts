import type { TBbox, TOfficeSummary } from "@repo/types";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";

import type { TDatabase } from "../db/client";
import { offices, reviews, type TOfficeInsert } from "../db/schema";
import type {
  IOfficeDetailRepository,
  IOfficeRepository,
} from "../services/officeService";

/**
 * 시딩만 필요한 좁은 인터페이스. 시딩 서비스가 조회 메서드까지 알 필요는 없다 —
 * 넓은 타입에 의존하면 조회 쪽이 늘 때마다 시딩 테스트의 fake 를 같이 부풀려야 한다.
 */
export interface IOfficeUpsertRepository {
  upsertMany: (rows: TOfficeInsert[]) => Promise<number>;
}

export interface IOfficeWriteRepository
  extends IOfficeRepository,
    IOfficeDetailRepository,
    IOfficeUpsertRepository {}

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

  findById: async (id: string): Promise<TOfficeSummary | null> => {
    const rows = await db
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
      .where(eq(offices.id, id))
      .limit(1);

    return rows[0] ?? null;
  },

  /** 숨겨진 리뷰는 집계에서 뺀다 (AC5) — 신고로 가려진 평점이 평균을 흔들면 안 된다. */
  findVisibleRatingsByOfficeId: async (officeId: string): Promise<number[]> => {
    const rows = await db
      .select({ rating: reviews.rating })
      .from(reviews)
      .where(and(eq(reviews.officeId, officeId), isNull(reviews.hiddenAt)));

    return rows.map((row) => row.rating);
  },

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
