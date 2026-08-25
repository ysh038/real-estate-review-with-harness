import type { THelpfulResponse, TReview, TReviewListResponse } from "@repo/types";

import type { IAuthUser } from "./authService";
import {
  decodeCursor,
  encodeCursor,
  type ICursorPosition,
} from "../lib/cursor";
import { isUniqueViolation } from "../lib/pgErrors";
import { containsProfanity } from "../lib/profanity";

/** repository 가 돌려주는 원시 행 — 작성자가 join 으로 붙어 있고 날짜는 아직 Date 다. */
export interface IReviewListRow {
  id: string;
  officeId: string;
  rating: number;
  content: string;
  nickname: string;
  profileImageUrl: string | null;
  createdAt: Date;
  dealType: string | null;
  dealResult: string | null;
  visitedYear: number | null;
  visitedMonth: number | null;
  tags: string[];
  helpfulCount: number;
  /** requestingUserId를 안 넘겼으면(비로그인) null. */
  isHelpful: boolean | null;
}

export interface IReviewRepository {
  findByOfficeId: (
    officeId: string,
    limit: number,
    after?: ICursorPosition,
    /** 로그인한 뷰어의 id — isHelpful 계산에 쓰인다. 없으면(비로그인) isHelpful은 전부 null. */
    requestingUserId?: string | null,
  ) => Promise<IReviewListRow[]>;
}

export class InvalidCursorError extends Error {
  constructor() {
    super("커서 형식이 올바르지 않습니다");
    this.name = "InvalidCursorError";
  }
}

/** repository 가 쓰기 메서드에서 돌려주는 원시 행 — 소유권 확인·응답 조립에 필요한 만큼만. */
export interface IReviewOwnedRow {
  id: string;
  officeId: string;
  userId: string;
  rating: number;
  content: string;
  createdAt: Date;
  dealType: string | null;
  dealResult: string | null;
  visitedYear: number | null;
  visitedMonth: number | null;
  tags: string[];
  helpfulCount: number;
  isHelpful: boolean;
}

export interface IReviewWriteRepository extends IReviewRepository {
  insert: (row: {
    officeId: string;
    userId: string;
    rating: number;
    content: string;
    createdFromIp: string | null;
    dealType: string | null;
    dealResult: string | null;
    visitedYear: number | null;
    visitedMonth: number | null;
    /** 중복은 서비스가 이미 걸러 보낸다 (AC7) — repository는 그대로 저장만 한다. */
    tags: string[];
  }) => Promise<IReviewOwnedRow>;
  findById: (id: string) => Promise<IReviewOwnedRow | null>;
  update: (
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
  ) => Promise<IReviewOwnedRow>;
  deleteById: (id: string) => Promise<void>;
  /** AC7: 같은 (사무소, IP) 조합으로 24시간 안에 이미 작성된 리뷰가 있는지. */
  hasRecentReviewFromIp: (officeId: string, ip: string) => Promise<boolean>;
  insertReport: (reviewId: string, reporterUserId: string) => Promise<void>;
  /** 신고 개수가 threshold 이상이면 hidden_at 을 원자적으로 설정한다 (경합 안전, 설계 메모 참고). */
  hideIfThresholdReached: (reviewId: string, threshold: number) => Promise<void>;
  /** 이미 눌렀으면 취소, 안 눌렀으면 등록 — 토글 후의 최종 상태를 반환한다. */
  toggleHelpful: (
    reviewId: string,
    userId: string,
  ) => Promise<{ helpfulCount: number; isHelpful: boolean }>;
}

export class ReviewNotFoundError extends Error {
  constructor() {
    super("리뷰를 찾을 수 없습니다");
    this.name = "ReviewNotFoundError";
  }
}

export class ForbiddenReviewActionError extends Error {
  constructor() {
    super("본인 리뷰에만 할 수 있는 작업입니다");
    this.name = "ForbiddenReviewActionError";
  }
}

/** AC6: 사무소당 1인 1리뷰 — DB unique 제약 위반을 의미 있는 에러로 바꾼다. */
export class DuplicateReviewError extends Error {
  constructor() {
    super("이미 이 사무소에 리뷰를 작성했습니다");
    this.name = "DuplicateReviewError";
  }
}

/** AC7: IP+사무소 rate limit. */
export class ReviewRateLimitedError extends Error {
  constructor() {
    super("같은 사무소에는 하루에 한 번만 리뷰를 작성할 수 있습니다");
    this.name = "ReviewRateLimitedError";
  }
}

/** AC16: 본인 리뷰 신고 금지. */
export class SelfReportError extends Error {
  constructor() {
    super("본인이 작성한 리뷰는 신고할 수 없습니다");
    this.name = "SelfReportError";
  }
}

/** AC17: 리뷰당 1인 1회 신고 — DB unique 제약 위반을 의미 있는 에러로 바꾼다. */
export class DuplicateReportError extends Error {
  constructor() {
    super("이미 신고한 리뷰입니다");
    this.name = "DuplicateReportError";
  }
}

/** review-profanity-filter AC5·AC7: 본문에 비속어가 검출되면 작성·수정을 막는다. */
export class ProfanityError extends Error {
  constructor() {
    super("부적절한 표현이 포함되어 있습니다");
    this.name = "ProfanityError";
  }
}

/** 신고가 이 개수에 도달하면 자동으로 숨겨진다 (AC18). */
export const REPORT_HIDE_THRESHOLD = 5;

const toReview = (row: IReviewListRow): TReview => ({
  id: row.id,
  officeId: row.officeId,
  rating: row.rating,
  content: row.content,
  author: { nickname: row.nickname, profileImageUrl: row.profileImageUrl },
  createdAt: row.createdAt.toISOString(),
  dealType: row.dealType as TReview["dealType"],
  dealResult: row.dealResult as TReview["dealResult"],
  visitedYear: row.visitedYear,
  visitedMonth: row.visitedMonth,
  tags: row.tags as TReview["tags"],
  helpfulCount: row.helpfulCount,
  isHelpful: row.isHelpful,
});

const toReviewWithAuthor = (
  row: IReviewOwnedRow,
  author: Pick<IAuthUser, "nickname" | "profileImageUrl">,
): TReview => ({
  id: row.id,
  officeId: row.officeId,
  rating: row.rating,
  content: row.content,
  author: { nickname: author.nickname, profileImageUrl: author.profileImageUrl },
  createdAt: row.createdAt.toISOString(),
  dealType: row.dealType as TReview["dealType"],
  dealResult: row.dealResult as TReview["dealResult"],
  visitedYear: row.visitedYear,
  visitedMonth: row.visitedMonth,
  tags: row.tags as TReview["tags"],
  helpfulCount: row.helpfulCount,
  isHelpful: row.isHelpful,
});

export interface IListOptions {
  limit: number;
  cursor?: string;
}

export interface ICreateReviewParams {
  officeId: string;
  authUser: IAuthUser;
  rating: number;
  content: string;
  clientIp: string | null;
  dealType?: string | null;
  dealResult?: string | null;
  visitedYear?: number | null;
  visitedMonth?: number | null;
  tags?: string[];
}

export interface IUpdateReviewParams {
  reviewId: string;
  authUser: IAuthUser;
  rating: number;
  content: string;
  dealType?: string | null;
  dealResult?: string | null;
  visitedYear?: number | null;
  visitedMonth?: number | null;
  tags?: string[];
}

/** AC7: 중복 태그가 섞여 와도 저장은 1건으로 — repository의 PK(review_id, tag_key) 위반을
 * 애초에 만들지 않는다. */
const dedupeTags = (tags: string[] | undefined): string[] => [...new Set(tags ?? [])];

export interface IReviewOwnerActionParams {
  reviewId: string;
  authUser: IAuthUser;
}

export const createReviewService = (repository: IReviewWriteRepository) => ({
  create: async (params: ICreateReviewParams): Promise<TReview> => {
    if (containsProfanity(params.content)) throw new ProfanityError();

    if (params.clientIp) {
      // AC7: 작성자가 달라도 같은 (IP, 사무소)면 24시간 안에는 막는다.
      const hasRecent = await repository.hasRecentReviewFromIp(
        params.officeId,
        params.clientIp,
      );
      if (hasRecent) throw new ReviewRateLimitedError();
    }

    try {
      const row = await repository.insert({
        officeId: params.officeId,
        userId: params.authUser.id,
        rating: params.rating,
        content: params.content,
        createdFromIp: params.clientIp,
        dealType: params.dealType ?? null,
        dealResult: params.dealResult ?? null,
        visitedYear: params.visitedYear ?? null,
        visitedMonth: params.visitedMonth ?? null,
        tags: dedupeTags(params.tags),
      });
      return toReviewWithAuthor(row, params.authUser);
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateReviewError();
      throw error;
    }
  },

  update: async (params: IUpdateReviewParams): Promise<TReview> => {
    if (containsProfanity(params.content)) throw new ProfanityError();

    const existing = await repository.findById(params.reviewId);
    if (!existing) throw new ReviewNotFoundError();
    if (existing.userId !== params.authUser.id) throw new ForbiddenReviewActionError();

    const updated = await repository.update(params.reviewId, {
      rating: params.rating,
      content: params.content,
      dealType: params.dealType ?? null,
      dealResult: params.dealResult ?? null,
      visitedYear: params.visitedYear ?? null,
      visitedMonth: params.visitedMonth ?? null,
      tags: dedupeTags(params.tags),
    });
    return toReviewWithAuthor(updated, params.authUser);
  },

  remove: async (params: IReviewOwnerActionParams): Promise<void> => {
    const existing = await repository.findById(params.reviewId);
    if (!existing) throw new ReviewNotFoundError();
    if (existing.userId !== params.authUser.id) throw new ForbiddenReviewActionError();

    await repository.deleteById(params.reviewId);
  },

  report: async (params: IReviewOwnerActionParams): Promise<void> => {
    const existing = await repository.findById(params.reviewId);
    if (!existing) throw new ReviewNotFoundError();
    if (existing.userId === params.authUser.id) throw new SelfReportError();

    try {
      await repository.insertReport(params.reviewId, params.authUser.id);
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateReportError();
      throw error;
    }

    await repository.hideIfThresholdReached(params.reviewId, REPORT_HIDE_THRESHOLD);
  },

  listByOfficeId: async (
    officeId: string,
    { limit, cursor }: IListOptions,
    requestingUserId?: string | null,
  ): Promise<TReviewListResponse> => {
    let after: ICursorPosition | undefined;
    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      // 깨진 커서를 무시하고 첫 페이지를 주면 클라이언트는 목록이 되감긴 걸 눈치채지 못한다.
      if (!decoded) throw new InvalidCursorError();
      after = decoded;
    }

    // 상한보다 1건 더 받아야 "다음 페이지가 있다"를 알 수 있다 (officeService 와 같은 수법).
    const rows = await repository.findByOfficeId(
      officeId,
      limit + 1,
      after,
      requestingUserId,
    );
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

  toggleHelpful: async (params: {
    reviewId: string;
    userId: string;
  }): Promise<THelpfulResponse> => {
    const existing = await repository.findById(params.reviewId);
    if (!existing) throw new ReviewNotFoundError();

    return repository.toggleHelpful(params.reviewId, params.userId);
  },
});

export type TReviewService = ReturnType<typeof createReviewService>;
