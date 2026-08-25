import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";

import type { TDatabase } from "../db/client";
import {
  offices,
  reviewHelpfulVotes,
  reviewReports,
  reviews,
  reviewTags,
  users,
} from "../db/schema";
import type { ICursorPosition } from "../lib/cursor";
import type {
  IMyReviewRow,
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

/** 여러 리뷰의 "도움돼요" 개수를 한 번에 — N+1 방지 (findTagsByReviewIds와 같은 패턴). */
const findHelpfulCountsByReviewIds = async (
  db: TDbOrTx,
  reviewIds: string[],
): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  if (reviewIds.length === 0) return map;

  const rows = await db
    .select({
      reviewId: reviewHelpfulVotes.reviewId,
      count: sql<number>`count(*)::int`,
    })
    .from(reviewHelpfulVotes)
    .where(inArray(reviewHelpfulVotes.reviewId, reviewIds))
    .groupBy(reviewHelpfulVotes.reviewId);

  for (const row of rows) map.set(row.reviewId, row.count);
  return map;
};

/** 주어진 사용자가 이미 도움돼요를 누른 리뷰 id 집합 — requestingUserId가 있을 때만 조회한다. */
const findUserHelpfulReviewIds = async (
  db: TDbOrTx,
  reviewIds: string[],
  userId: string,
): Promise<Set<string>> => {
  if (reviewIds.length === 0) return new Set();

  const rows = await db
    .select({ reviewId: reviewHelpfulVotes.reviewId })
    .from(reviewHelpfulVotes)
    .where(
      and(
        inArray(reviewHelpfulVotes.reviewId, reviewIds),
        eq(reviewHelpfulVotes.userId, userId),
      ),
    );
  return new Set(rows.map((row) => row.reviewId));
};

export const createReviewRepository = (
  db: TDatabase,
): IReviewWriteRepository => ({
  findByOfficeId: async (
    officeId: string,
    limit: number,
    after?: ICursorPosition,
    requestingUserId?: string | null,
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

    const reviewIds = rows.map((row) => row.id);
    const [tagsByReview, helpfulCounts, userHelpfulIds] = await Promise.all([
      findTagsByReviewIds(db, reviewIds),
      findHelpfulCountsByReviewIds(db, reviewIds),
      requestingUserId
        ? findUserHelpfulReviewIds(db, reviewIds, requestingUserId)
        : Promise.resolve(null),
    ]);

    return rows.map((row) => ({
      ...row,
      tags: tagsByReview.get(row.id) ?? [],
      helpfulCount: helpfulCounts.get(row.id) ?? 0,
      isHelpful: userHelpfulIds ? userHelpfulIds.has(row.id) : null,
    }));
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

      // 방금 만든 리뷰라 도움돼요 투표가 있을 수 없다 — 조회 없이 확정값(설계 메모 참고).
      return { ...inserted, tags, helpfulCount: 0, isHelpful: false };
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
    // findById는 소유권·존재 확인용이라 helpfulCount/isHelpful을 표시에 쓰지 않는다 —
    // 조회 비용을 아끼려고 확정값을 둔다.
    return { ...row, tags: tagsByReview.get(row.id) ?? [], helpfulCount: 0, isHelpful: false };
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

      // 수정해도 기존에 쌓인 도움돼요 투표는 그대로다 — 0으로 하드코딩하지 않고 실제
      // 값을 반영한다(설계 메모: "update() 응답의 helpfulCount는 실제 값을 반영한다").
      const [helpfulCounts, userHelpfulIds] = await Promise.all([
        findHelpfulCountsByReviewIds(tx, [id]),
        findUserHelpfulReviewIds(tx, [id], updated.userId),
      ]);

      return {
        ...updated,
        tags,
        helpfulCount: helpfulCounts.get(id) ?? 0,
        isHelpful: userHelpfulIds.has(id),
      };
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

  // check-then-act — 결과가 누적돼 다른 부작용(자동 숨김 등)을 일으키는 게 아니라 단순
  // on/off 토글이라 원자적 SQL로 감쌀 만큼의 경합 위험이 아니다(설계 메모 참고).
  toggleHelpful: async (
    reviewId: string,
    userId: string,
  ): Promise<{ helpfulCount: number; isHelpful: boolean }> => {
    const [existing] = await db
      .select()
      .from(reviewHelpfulVotes)
      .where(
        and(
          eq(reviewHelpfulVotes.reviewId, reviewId),
          eq(reviewHelpfulVotes.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .delete(reviewHelpfulVotes)
        .where(
          and(
            eq(reviewHelpfulVotes.reviewId, reviewId),
            eq(reviewHelpfulVotes.userId, userId),
          ),
        );
    } else {
      await db.insert(reviewHelpfulVotes).values({ reviewId, userId });
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewHelpfulVotes)
      .where(eq(reviewHelpfulVotes.reviewId, reviewId));

    return { helpfulCount: count ?? 0, isHelpful: !existing };
  },

  // 공개 목록(findByOfficeId)과 달리 hiddenAt 으로 거르지 않는다 — 본인에게는
  // 숨겨진 자기 리뷰도 보여준다(AC5, docs/specs/my-reviews-list.md).
  findByUserId: async (
    userId: string,
    limit: number,
    after?: ICursorPosition,
  ): Promise<IMyReviewRow[]> => {
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
        officeName: offices.name,
        rating: reviews.rating,
        content: reviews.content,
        createdAt: reviews.createdAt,
        hiddenAt: reviews.hiddenAt,
        dealType: reviews.dealType,
        dealResult: reviews.dealResult,
        visitedYear: reviews.visitedYear,
        visitedMonth: reviews.visitedMonth,
      })
      .from(reviews)
      .innerJoin(offices, eq(reviews.officeId, offices.id))
      .where(and(eq(reviews.userId, userId), afterCondition))
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(limit);

    const reviewIds = rows.map((row) => row.id);
    const [tagsByReview, helpfulCounts, userHelpfulIds] = await Promise.all([
      findTagsByReviewIds(db, reviewIds),
      findHelpfulCountsByReviewIds(db, reviewIds),
      findUserHelpfulReviewIds(db, reviewIds, userId),
    ]);

    return rows.map((row) => ({
      ...row,
      tags: tagsByReview.get(row.id) ?? [],
      helpfulCount: helpfulCounts.get(row.id) ?? 0,
      isHelpful: userHelpfulIds.has(row.id),
    }));
  },
});
