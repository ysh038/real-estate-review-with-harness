import type {
  TAdminHiddenReview,
  TAdminHiddenReviewListResponse,
  THelpfulResponse,
  TMyReview,
  TMyReviewListResponse,
  TReview,
  TReviewListResponse,
  TReviewPhoto,
  TReviewSort,
} from "@repo/types";

import type { IAuthUser } from "./authService";
import {
  decodeCursor,
  encodeCursor,
  type ICursorPosition,
} from "../lib/cursor";
import { isUniqueViolation } from "../lib/pgErrors";
import { resolvePhotoPublicUrl } from "../lib/photoStorage";
import { containsProfanity } from "../lib/profanity";

/** repository 가 사진 목록으로 돌려주는 최소 형태 — 순서(position)는 이미 반영돼 있다. */
export interface IPhotoRow {
  storageKey: string;
}

/** repository 가 돌려주는 원시 행 — 작성자가 join 으로 붙어 있고 날짜는 아직 Date 다. */
export interface IReviewListRow {
  id: string;
  officeId: string;
  rating: number;
  content: string;
  /** 작성자가 탈퇴했으면 null(원본과 동일한 SET NULL 익명화, member-account-deletion 명세). */
  nickname: string | null;
  profileImageUrl: string | null;
  createdAt: Date;
  dealType: string | null;
  dealResult: string | null;
  expertise: string | null;
  defectResponse: string | null;
  visitedYear: number | null;
  visitedMonth: number | null;
  tags: string[];
  /** 업로드(제출) 순서대로. 없으면 빈 배열. */
  photos: IPhotoRow[];
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
    /** 기본 최신순. review-permalink-report-and-sort 명세. */
    sort?: TReviewSort,
  ) => Promise<IReviewListRow[]>;
}

/** repository 가 돌려주는 "내 리뷰" 행 — 작성자는 항상 조회자 본인이라 nickname 등은
 * 필요 없다(호출부가 이미 아는 authUser로 author를 채운다). */
export interface IMyReviewRow {
  id: string;
  officeId: string;
  officeName: string;
  rating: number;
  content: string;
  createdAt: Date;
  /** null이면 숨김 아님. AC5: 본인에게는 상태를 그대로 보여준다. */
  hiddenAt: Date | null;
  dealType: string | null;
  dealResult: string | null;
  expertise: string | null;
  defectResponse: string | null;
  visitedYear: number | null;
  visitedMonth: number | null;
  tags: string[];
  photos: IPhotoRow[];
  helpfulCount: number;
  isHelpful: boolean;
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
  /** 작성자가 탈퇴했으면 null(SET NULL 익명화). 소유권 비교는 항상 항등 비교라 자연히 불일치로 처리된다. */
  userId: string | null;
  rating: number;
  content: string;
  createdAt: Date;
  /** null이면 숨김 아님. admin-hidden-reviews AC10: 복구 전 "이미 노출 중" 판별에 쓴다. */
  hiddenAt: Date | null;
  dealType: string | null;
  dealResult: string | null;
  expertise: string | null;
  defectResponse: string | null;
  visitedYear: number | null;
  visitedMonth: number | null;
  tags: string[];
  photos: IPhotoRow[];
  helpfulCount: number;
  isHelpful: boolean;
}

/** 공개 목록 행(IReviewListRow)에 관리자 전용 필드만 더한다. */
export interface IAdminHiddenReviewRow extends IReviewListRow {
  officeName: string;
  reportCount: number;
  hiddenAt: Date;
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
    expertise: string | null;
    defectResponse: string | null;
    visitedYear: number | null;
    visitedMonth: number | null;
    /** 중복은 서비스가 이미 걸러 보낸다 (AC7) — repository는 그대로 저장만 한다. */
    tags: string[];
    /** 업로드 API로 먼저 받은 storageKey들. 제출한 순서 = 표시 순서(position). */
    photoKeys: string[];
  }) => Promise<IReviewOwnedRow>;
  findById: (id: string) => Promise<IReviewOwnedRow | null>;
  update: (
    id: string,
    patch: {
      rating: number;
      content: string;
      dealType: string | null;
      dealResult: string | null;
      expertise: string | null;
      defectResponse: string | null;
      visitedYear: number | null;
      visitedMonth: number | null;
      tags: string[];
      photoKeys: string[];
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
  /** 숨겨진 리뷰도 포함한다(AC5) — 공개 목록(findByOfficeId)과 다른 지점. */
  findByUserId: (
    userId: string,
    limit: number,
    after?: ICursorPosition,
  ) => Promise<IMyReviewRow[]>;
  /** 숨겨진 리뷰만, 관리자 전용 필드(officeName·reportCount)와 함께. */
  findHidden: (
    limit: number,
    after?: ICursorPosition,
  ) => Promise<IAdminHiddenReviewRow[]>;
  /** hidden_at 을 null로 되돌린다. 존재하지 않으면 null. */
  restore: (reviewId: string) => Promise<IReviewListRow | null>;
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

/** admin-hidden-reviews AC10: 이미 노출 중인 리뷰를 복구하려 하면 던진다. */
export class ReviewAlreadyVisibleError extends Error {
  constructor() {
    super("이미 노출 중인 리뷰입니다");
    this.name = "ReviewAlreadyVisibleError";
  }
}

/** 신고가 이 개수에 도달하면 자동으로 숨겨진다 (AC18). */
export const REPORT_HIDE_THRESHOLD = 5;

/**
 * 탈퇴한 사용자가 쓴 리뷰의 표시용 닉네임. 원본은 리뷰에 작성자 닉네임을 공개
 * 노출하지 않아 참조할 인터페이스가 없다 — 독자적으로 정한 고정 문구
 * (member-account-deletion-and-anonymization 명세 설계 메모).
 */
export const DELETED_USER_NICKNAME = "탈퇴한 사용자";

/** photoPublicUrl 미설정(undefined)이면 storageKey를 그대로 url로 쓴다(설계 메모). */
const toPhotoList = (photos: IPhotoRow[], photoPublicUrl: string | undefined): TReviewPhoto[] =>
  photos.map((photo) => ({
    storageKey: photo.storageKey,
    url: resolvePhotoPublicUrl(photo.storageKey, photoPublicUrl),
  }));

const toReview = (row: IReviewListRow, photoPublicUrl: string | undefined): TReview => ({
  id: row.id,
  officeId: row.officeId,
  rating: row.rating,
  content: row.content,
  author:
    row.nickname != null
      ? { nickname: row.nickname, profileImageUrl: row.profileImageUrl }
      : { nickname: DELETED_USER_NICKNAME, profileImageUrl: null },
  createdAt: row.createdAt.toISOString(),
  dealType: row.dealType as TReview["dealType"],
  dealResult: row.dealResult as TReview["dealResult"],
  expertise: row.expertise as TReview["expertise"],
  defectResponse: row.defectResponse as TReview["defectResponse"],
  visitedYear: row.visitedYear,
  visitedMonth: row.visitedMonth,
  tags: row.tags as TReview["tags"],
  photos: toPhotoList(row.photos, photoPublicUrl),
  helpfulCount: row.helpfulCount,
  isHelpful: row.isHelpful,
});

const toReviewWithAuthor = (
  row: IReviewOwnedRow,
  author: Pick<IAuthUser, "nickname" | "profileImageUrl">,
  photoPublicUrl: string | undefined,
): TReview => ({
  id: row.id,
  officeId: row.officeId,
  rating: row.rating,
  content: row.content,
  author: { nickname: author.nickname, profileImageUrl: author.profileImageUrl },
  createdAt: row.createdAt.toISOString(),
  dealType: row.dealType as TReview["dealType"],
  dealResult: row.dealResult as TReview["dealResult"],
  expertise: row.expertise as TReview["expertise"],
  defectResponse: row.defectResponse as TReview["defectResponse"],
  visitedYear: row.visitedYear,
  visitedMonth: row.visitedMonth,
  tags: row.tags as TReview["tags"],
  photos: toPhotoList(row.photos, photoPublicUrl),
  helpfulCount: row.helpfulCount,
  isHelpful: row.isHelpful,
});

const toMyReview = (
  row: IMyReviewRow,
  author: Pick<IAuthUser, "nickname" | "profileImageUrl">,
  photoPublicUrl: string | undefined,
): TMyReview => ({
  id: row.id,
  officeId: row.officeId,
  officeName: row.officeName,
  rating: row.rating,
  content: row.content,
  author: { nickname: author.nickname, profileImageUrl: author.profileImageUrl },
  createdAt: row.createdAt.toISOString(),
  isHidden: row.hiddenAt != null,
  dealType: row.dealType as TReview["dealType"],
  dealResult: row.dealResult as TReview["dealResult"],
  expertise: row.expertise as TReview["expertise"],
  defectResponse: row.defectResponse as TReview["defectResponse"],
  visitedYear: row.visitedYear,
  visitedMonth: row.visitedMonth,
  tags: row.tags as TReview["tags"],
  photos: toPhotoList(row.photos, photoPublicUrl),
  helpfulCount: row.helpfulCount,
  isHelpful: row.isHelpful,
});

const toAdminHiddenReview = (
  row: IAdminHiddenReviewRow,
  photoPublicUrl: string | undefined,
): TAdminHiddenReview => ({
  ...toReview(row, photoPublicUrl),
  officeName: row.officeName,
  reportCount: row.reportCount,
  hiddenAt: row.hiddenAt.toISOString(),
});

export interface IListOptions {
  limit: number;
  cursor?: string;
}

/** `listByOfficeId` 전용 — 정렬은 사무소 공개 목록에만 있다 (다른 IListOptions 사용처엔 없음). */
export interface IOfficeReviewListOptions extends IListOptions {
  sort?: TReviewSort;
}

export interface ICreateReviewParams {
  officeId: string;
  authUser: IAuthUser;
  rating: number;
  content: string;
  clientIp: string | null;
  dealType?: string | null;
  dealResult?: string | null;
  expertise?: string | null;
  defectResponse?: string | null;
  visitedYear?: number | null;
  visitedMonth?: number | null;
  tags?: string[];
  photoKeys?: string[];
}

export interface IUpdateReviewParams {
  reviewId: string;
  authUser: IAuthUser;
  rating: number;
  content: string;
  dealType?: string | null;
  dealResult?: string | null;
  expertise?: string | null;
  defectResponse?: string | null;
  visitedYear?: number | null;
  visitedMonth?: number | null;
  tags?: string[];
  photoKeys?: string[];
}

/** AC7: 중복 태그가 섞여 와도 저장은 1건으로 — repository의 PK(review_id, tag_key) 위반을
 * 애초에 만들지 않는다. */
const dedupeTags = (tags: string[] | undefined): string[] => [...new Set(tags ?? [])];

export interface IReviewOwnerActionParams {
  reviewId: string;
  authUser: IAuthUser;
}

export const createReviewService = (
  repository: IReviewWriteRepository,
  /** S3_PUBLIC_URL — 미설정이면 photos[].url이 storageKey 그대로 나간다(설계 메모). */
  photoPublicUrl?: string,
) => ({
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
        expertise: params.expertise ?? null,
        defectResponse: params.defectResponse ?? null,
        visitedYear: params.visitedYear ?? null,
        visitedMonth: params.visitedMonth ?? null,
        tags: dedupeTags(params.tags),
        photoKeys: params.photoKeys ?? [],
      });
      return toReviewWithAuthor(row, params.authUser, photoPublicUrl);
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
      expertise: params.expertise ?? null,
      defectResponse: params.defectResponse ?? null,
      visitedYear: params.visitedYear ?? null,
      visitedMonth: params.visitedMonth ?? null,
      tags: dedupeTags(params.tags),
      photoKeys: params.photoKeys ?? [],
    });
    return toReviewWithAuthor(updated, params.authUser, photoPublicUrl);
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
    { limit, cursor, sort = "latest" }: IOfficeReviewListOptions,
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
      sort,
    );
    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return {
      reviews: page.map((row) => toReview(row, photoPublicUrl)),
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

  listByUserId: async (
    authUser: IAuthUser,
    { limit, cursor }: IListOptions,
  ): Promise<TMyReviewListResponse> => {
    let after: ICursorPosition | undefined;
    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      if (!decoded) throw new InvalidCursorError();
      after = decoded;
    }

    const rows = await repository.findByUserId(authUser.id, limit + 1, after);
    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return {
      reviews: page.map((row) => toMyReview(row, authUser, photoPublicUrl)),
      nextCursor:
        hasNext && last
          ? encodeCursor({ createdAt: last.createdAt, id: last.id })
          : null,
    };
  },

  listHidden: async ({
    limit,
    cursor,
  }: IListOptions): Promise<TAdminHiddenReviewListResponse> => {
    let after: ICursorPosition | undefined;
    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      if (!decoded) throw new InvalidCursorError();
      after = decoded;
    }

    const rows = await repository.findHidden(limit + 1, after);
    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    return {
      reviews: page.map((row) => toAdminHiddenReview(row, photoPublicUrl)),
      nextCursor:
        hasNext && last
          ? encodeCursor({ createdAt: last.createdAt, id: last.id })
          : null,
    };
  },

  restore: async (reviewId: string): Promise<TReview> => {
    const existing = await repository.findById(reviewId);
    if (!existing) throw new ReviewNotFoundError();
    if (existing.hiddenAt == null) throw new ReviewAlreadyVisibleError();

    const restored = await repository.restore(reviewId);
    if (!restored) throw new ReviewNotFoundError();
    return toReview(restored, photoPublicUrl);
  },
});

export type TReviewService = ReturnType<typeof createReviewService>;
