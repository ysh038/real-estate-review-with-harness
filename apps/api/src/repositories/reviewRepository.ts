import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";

import type { TDatabase } from "../db/client";
import { reviewReports, reviews, reviewTags, users } from "../db/schema";
import type { ICursorPosition } from "../lib/cursor";
import type {
  IReviewListRow,
  IReviewOwnedRow,
  IReviewWriteRepository,
} from "../services/reviewService";

/**
 * 트랜잭션 콜백이 주는 `tx` 는 `TDatabase` 와 구조가 달라(`$client` 없음) 그대로 대입이
 * 안 된다. transaction()의 콜백 파라미터 타입을 직접 뽑아 일반 db/tx 양쪽에서 쓸 수 있게
 * 열어둔다 — helpers(findTagsByReviewIds·replaceTags)를 insert/update의 트랜잭션 안에서도
 * 그대로 재사용하기 위함.
 */
type TDbOrTx = TDatabase | Parameters<Parameters<TDatabase["transaction"]>[0]>[0];

const OWNED_ROW_COLUMNS = {
  id: reviews.id,
  officeId: reviews.officeId,
  userId: reviews.userId,
  rating: reviews.rating,
  content: reviews.content,
  createdAt: reviews.createdAt,
  dealType: reviews.dealType,
  dealResult: reviews.dealResult,
  visitedYear: reviews.visitedYear,
  visitedMonth: reviews.visitedMonth,
};

/** 여러 리뷰의 태그를 한 번에 — N+1 방지. */
const findTagsByReviewIds = async (
  db: TDbOrTx,
  reviewIds: string[],
): Promise<Map<string, string[]>> => {
  const map = new Map<string, string[]>();
  if (reviewIds.length === 0) return map;

  const rows = await db
    .select({ reviewId: reviewTags.reviewId, tagKey: reviewTags.tagKey })
    .from(reviewTags)
    .where(inArray(reviewTags.reviewId, reviewIds));

  for (const row of rows) {
    const list = map.get(row.reviewId) ?? [];
    list.push(row.tagKey);
    map.set(row.reviewId, list);
  }
  return map;
};

/** insert/update 후 review_tags 를 통째로 교체한다 — PATCH=전체교체 원칙(설계 메모)과 같은 결. */
const replaceTags = async (
  db: TDbOrTx,
  reviewId: string,
  tags: string[],
): Promise<void> => {
  await db.delete(reviewTags).where(eq(reviewTags.reviewId, reviewId));
  if (tags.length === 0) return;
  await db.insert(reviewTags).values(tags.map((tagKey) => ({ reviewId, tagKey })));
};

export const createReviewRepository = (
  db: TDatabase,
): IReviewWriteRepository => ({
  findByOfficeId: async (
    officeId: string,
    limit: number,
    after?: ICursorPosition,
  ): Promise<IReviewListRow[]> => {
    // 커서 조건은 정렬 키와 같은 (created_at, id) 조합이어야 한다.
    // created_at 만 비교하면 동시각 리뷰가 통째로 건너뛰어지거나 겹친다.
    const afterCondition = after
      ? or(
          lt(reviews.createdAt, after.createdAt),
          and(
            eq(reviews.createdAt, after.createdAt),
            lt(reviews.id, after.id),
          ),
        )
      : undefined;

    const rows = await db
      .select({
        id: reviews.id,
        officeId: reviews.officeId,
        rating: reviews.rating,
        content: reviews.content,
        nickname: users.nickname,
        profileImageUrl: users.profileImageUrl,
        createdAt: reviews.createdAt,
        dealType: reviews.dealType,
        dealResult: reviews.dealResult,
        visitedYear: reviews.visitedYear,
        visitedMonth: reviews.visitedMonth,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(
        and(
          eq(reviews.officeId, officeId),
          // AC17: 숨겨진 리뷰는 목록에 나오지 않는다.
          isNull(reviews.hiddenAt),
          afterCondition,
        ),
      )
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(limit);

    const tagsByReview = await findTagsByReviewIds(
      db,
      rows.map((row) => row.id),
    );
    return rows.map((row) => ({ ...row, tags: tagsByReview.get(row.id) ?? [] }));
  },

  insert: async (row): Promise<IReviewOwnedRow> => {
    const { tags, ...reviewFields } = row;

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(reviews)
        .values(reviewFields)
        .returning(OWNED_ROW_COLUMNS);
      // insert가 실패하면 예외가 던져지므로 도달했다면 항상 행이 있다.
      if (!inserted) throw new Error("리뷰 생성이 행을 반환하지 않았습니다");

      if (tags.length > 0) {
        await tx.insert(reviewTags).values(tags.map((tagKey) => ({ reviewId: inserted.id, tagKey })));
      }

      return { ...inserted, tags };
    });
  },

  findById: async (id: string): Promise<IReviewOwnedRow | null> => {
    const [row] = await db
      .select(OWNED_ROW_COLUMNS)
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1);
    if (!row) return null;

    const tagsByReview = await findTagsByReviewIds(db, [row.id]);
    return { ...row, tags: tagsByReview.get(row.id) ?? [] };
  },

  update: async (
    id: string,
    patch: {
      rating: number;
      content: string;
      dealType: string | null;
      dealResult: string | null;
      visitedYear: number | null;
      visitedMonth: number | null;
      tags: string[];
    },
  ): Promise<IReviewOwnedRow> => {
    const { tags, ...reviewPatch } = patch;

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(reviews)
        .set({ ...reviewPatch, updatedAt: sql`now()` })
        .where(eq(reviews.id, id))
        .returning(OWNED_ROW_COLUMNS);
      if (!updated) throw new Error("리뷰 수정이 행을 반환하지 않았습니다");

      await replaceTags(tx, id, tags);

      return { ...updated, tags };
    });
  },

  deleteById: async (id: string): Promise<void> => {
    await db.delete(reviews).where(eq(reviews.id, id));
  },

  hasRecentReviewFromIp: async (
    officeId: string,
    ip: string,
  ): Promise<boolean> => {
    const [row] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.officeId, officeId),
          eq(reviews.createdFromIp, ip),
          gt(reviews.createdAt, sql`now() - interval '24 hours'`),
        ),
      )
      .limit(1);
    return !!row;
  },

  insertReport: async (
    reviewId: string,
    reporterUserId: string,
  ): Promise<void> => {
    await db.insert(reviewReports).values({ reviewId, reporterUserId });
  },

  // 신고 삽입 → 개수 세기 → hidden_at 갱신을 세 단계로 나누면 동시 신고 두 건이 둘 다
  // count=4로 읽어 임계치를 놓칠 수 있다. 단일 SQL로 원자성을 확보한다
  // (근거: docs/specs/review-write-and-report.md 설계 메모).
  hideIfThresholdReached: async (
    reviewId: string,
    threshold: number,
  ): Promise<void> => {
    await db.execute(sql`
      update ${reviews}
      set hidden_at = coalesce(hidden_at, now())
      where id = ${reviewId}
        and (select count(*) from ${reviewReports} where review_id = ${reviewId}) >= ${threshold}
    `);
  },
});
