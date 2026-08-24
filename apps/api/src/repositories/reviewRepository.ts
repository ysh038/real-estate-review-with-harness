import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";

import type { TDatabase } from "../db/client";
import { reviewReports, reviews, users } from "../db/schema";
import type { ICursorPosition } from "../lib/cursor";
import type {
  IReviewListRow,
  IReviewOwnedRow,
  IReviewWriteRepository,
} from "../services/reviewService";

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

    return db
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
  },

  insert: async (row): Promise<IReviewOwnedRow> => {
    const [inserted] = await db
      .insert(reviews)
      .values(row)
      .returning(OWNED_ROW_COLUMNS);
    // insert가 실패하면 예외가 던져지므로 도달했다면 항상 행이 있다.
    if (!inserted) throw new Error("리뷰 생성이 행을 반환하지 않았습니다");
    return inserted;
  },

  findById: async (id: string): Promise<IReviewOwnedRow | null> => {
    const [row] = await db
      .select(OWNED_ROW_COLUMNS)
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1);
    return row ?? null;
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
    },
  ): Promise<IReviewOwnedRow> => {
    const [updated] = await db
      .update(reviews)
      .set({
        rating: patch.rating,
        content: patch.content,
        dealType: patch.dealType,
        dealResult: patch.dealResult,
        visitedYear: patch.visitedYear,
        visitedMonth: patch.visitedMonth,
        updatedAt: sql`now()`,
      })
      .where(eq(reviews.id, id))
      .returning(OWNED_ROW_COLUMNS);
    if (!updated) throw new Error("리뷰 수정이 행을 반환하지 않았습니다");
    return updated;
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
