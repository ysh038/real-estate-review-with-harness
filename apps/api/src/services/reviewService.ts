import type { TReview, TReviewListResponse } from "@repo/types";

import {
  decodeCursor,
  encodeCursor,
  type ICursorPosition,
} from "../lib/cursor";

/** repository 가 돌려주는 원시 행 — 작성자가 join 으로 붙어 있고 날짜는 아직 Date 다. */
export interface IReviewListRow {
  id: string;
  officeId: string;
  rating: number;
  content: string;
  nickname: string;
  profileImageUrl: string | null;
  createdAt: Date;
}

export interface IReviewRepository {
  findByOfficeId: (
    officeId: string,
    limit: number,
    after?: ICursorPosition,
  ) => Promise<IReviewListRow[]>;
}

export class InvalidCursorError extends Error {
  constructor() {
    super("커서 형식이 올바르지 않습니다");
    this.name = "InvalidCursorError";
  }
}

const toReview = (row: IReviewListRow): TReview => ({
  id: row.id,
  officeId: row.officeId,
  rating: row.rating,
  content: row.content,
  author: { nickname: row.nickname, profileImageUrl: row.profileImageUrl },
  createdAt: row.createdAt.toISOString(),
});

export interface IListOptions {
  limit: number;
  cursor?: string;
}

export const createReviewService = (repository: IReviewRepository) => ({
  listByOfficeId: async (
    officeId: string,
    { limit, cursor }: IListOptions,
  ): Promise<TReviewListResponse> => {
    let after: ICursorPosition | undefined;
    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      // 깨진 커서를 무시하고 첫 페이지를 주면 클라이언트는 목록이 되감긴 걸 눈치채지 못한다.
      if (!decoded) throw new InvalidCursorError();
      after = decoded;
    }

    // 상한보다 1건 더 받아야 "다음 페이지가 있다"를 알 수 있다 (officeService 와 같은 수법).
    const rows = await repository.findByOfficeId(officeId, limit + 1, after);
    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return {
      reviews: page.map(toReview),
      nextCursor:
        hasNext && last
          ? encodeCursor({ createdAt: last.createdAt, id: last.id })
          : null,
    };
  },
});

export type TReviewService = ReturnType<typeof createReviewService>;
