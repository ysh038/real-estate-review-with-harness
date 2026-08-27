import type { TBbox, TTagCount } from "@repo/types";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";

import type { TDatabase } from "../db/client";
import { offices, reviews, reviewTags, type TOfficeInsert } from "../db/schema";
import type {
  IOfficeDetailRepository,
  IOfficeRepository,
  IOfficeSearchRepository,
  TOfficeSummaryRow,
} from "../services/officeService";

/**
 * ILIKE의 와일드카드 문자(`%`·`_`)와 이스케이프 문자(`\`) 자체를 리터럴로 escape한다 —
 * 안 그러면 검색어에 우연히 `%`가 들어간 순간 패턴 매칭으로 해석돼 엉뚱한 결과가 늘어난다
 * (office-search-bar AC9).
 */
const escapeLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`);

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
    IOfficeSearchRepository,
    IOfficeUpsertRepository {}

export const createOfficeRepository = (
  db: TDatabase,
): IOfficeWriteRepository => ({
  findByBbox: async (bbox: TBbox, limit: number): Promise<TOfficeSummaryRow[]> =>
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
        matchConfidence: offices.matchConfidence,
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

  findById: async (id: string): Promise<TOfficeSummaryRow | null> => {
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
        matchConfidence: offices.matchConfidence,
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

  /** 상세용 — 개수 제한 없이 전체 태그 집계, 개수 내림차순 (AC9). */
  findTagCountsByOfficeId: async (officeId: string): Promise<TTagCount[]> => {
    const rows = await db
      .select({ tag: reviewTags.tagKey, count: count(reviewTags.tagKey) })
      .from(reviewTags)
      .innerJoin(reviews, eq(reviewTags.reviewId, reviews.id))
      .where(and(eq(reviews.officeId, officeId), isNull(reviews.hiddenAt)))
      .groupBy(reviewTags.tagKey)
      .orderBy(desc(count(reviewTags.tagKey)));

    return rows.map((row) => ({ tag: row.tag as TTagCount["tag"], count: row.count }));
  },

  /**
   * bbox 목록용 — 여러 사무소를 한 번에(N+1 방지), 사무소별 상위 topN개만 (AC10).
   * SQL로 "그룹별 상위 N"을 직접 뽑는 대신 전체를 개수 내림차순으로 받아 애플리케이션에서
   * 사무소별로 topN개까지만 자른다 — 사무소 수가 최대 500(MAX_OFFICES_PER_BBOX)이라
   * 윈도우 함수 없이도 비용이 작다.
   */
  findTopTagCountsByOfficeIds: async (
    officeIds: string[],
    topN: number,
  ): Promise<Map<string, TTagCount[]>> => {
    const result = new Map<string, TTagCount[]>();
    if (officeIds.length === 0) return result;

    const rows = await db
      .select({
        officeId: reviews.officeId,
        tag: reviewTags.tagKey,
        count: count(reviewTags.tagKey),
      })
      .from(reviewTags)
      .innerJoin(reviews, eq(reviewTags.reviewId, reviews.id))
      .where(and(inArray(reviews.officeId, officeIds), isNull(reviews.hiddenAt)))
      .groupBy(reviews.officeId, reviewTags.tagKey)
      .orderBy(reviews.officeId, desc(count(reviewTags.tagKey)));

    for (const row of rows) {
      const existing = result.get(row.officeId) ?? [];
      if (existing.length >= topN) continue;
      existing.push({ tag: row.tag as TTagCount["tag"], count: row.count });
      result.set(row.officeId, existing);
    }

    return result;
  },

  /**
   * 이름·주소 ILIKE 매칭 + 비숨김 리뷰 수 내림차순 (office-search-bar 명세).
   * LEFT JOIN이라 리뷰가 하나도 없는 사무소도 결과에 남는다(count는 0).
   */
  searchByQuery: async (
    query: string,
    limit: number,
  ): Promise<TOfficeSummaryRow[]> => {
    const pattern = `%${escapeLikePattern(query)}%`;

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
        matchConfidence: offices.matchConfidence,
      })
      .from(offices)
      .leftJoin(
        reviews,
        and(eq(reviews.officeId, offices.id), isNull(reviews.hiddenAt)),
      )
      .where(or(ilike(offices.name, pattern), ilike(offices.address, pattern)))
      .groupBy(offices.id)
      .orderBy(desc(count(reviews.id)))
      .limit(limit);

    return rows;
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
          matchConfidence: sql`excluded.match_confidence`,
          updatedAt: sql`now()`,
        },
      });

    return rows.length;
  },
});
