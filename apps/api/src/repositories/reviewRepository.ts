import { and, desc, eq, isNull, lt, or } from "drizzle-orm";

import type { TDatabase } from "../db/client";
import { reviews, users, type TReviewInsert } from "../db/schema";
import type { ICursorPosition } from "../lib/cursor";
import type {
  IReviewRepository,
  IReviewListRow,
} from "../services/reviewService";

export interface IReviewWriteRepository extends IReviewRepository {
  insert: (row: TReviewInsert) => Promise<void>;
}

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

  insert: async (row: TReviewInsert): Promise<void> => {
    await db.insert(reviews).values(row);
  },
});
