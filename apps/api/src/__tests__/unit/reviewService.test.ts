import { describe, expect, it } from "vitest";

import { encodeCursor } from "../../lib/cursor";
import type { IAuthUser } from "../../services/authService";
import {
  createReviewService,
  DuplicateReportError,
  DuplicateReviewError,
  ForbiddenReviewActionError,
  ReviewNotFoundError,
  ReviewRateLimitedError,
  SelfReportError,
  type IReviewListRow,
  type IReviewOwnedRow,
} from "../../services/reviewService";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const buildRow = (index: number): IReviewListRow => ({
  id: `0000000${index}-1111-4222-8333-444455556666`,
  officeId: "office-1",
  rating: 5,
  content: "열 자를 넘기는 충분한 길이의 리뷰 본문입니다",
  nickname: `사용자${index}`,
  profileImageUrl: null,
  createdAt: new Date(`2026-08-${10 + index}T00:00:00.000Z`),
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
});

const createFakeRepository = createFakeReviewRepository;

const AUTH_USER: IAuthUser = {
  id: "user-1",
  nickname: "홍길동",
  profileImageUrl: null,
};

const CONTENT = "열 자를 넘기는 충분한 길이의 리뷰 본문입니다";

const buildOwnedRow = (
  overrides: Partial<IReviewOwnedRow> = {},
): IReviewOwnedRow => ({
  id: "review-1",
  officeId: "office-1",
  userId: AUTH_USER.id,
  rating: 5,
  content: CONTENT,
  createdAt: new Date("2026-08-20T00:00:00.000Z"),
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  ...overrides,
});

describe("reviewService.listByOfficeId", () => {
  it("AC9: 페이지 크기보다 결과가 많으면 nextCursor 를 함께 반환한다", async () => {
    const rows = [buildRow(1), buildRow(2), buildRow(3)];
    const service = createReviewService(createFakeRepository(rows));

    const result = await service.listByOfficeId("office-1", { limit: 2 });

    expect(result.reviews).toHaveLength(2);
    expect(result.nextCursor).not.toBeNull();
  });

  it("AC10: 마지막 페이지면 nextCursor 가 null 이다", async () => {
    const rows = [buildRow(1), buildRow(2)];
    const service = createReviewService(createFakeRepository(rows));

    const result = await service.listByOfficeId("office-1", { limit: 2 });

    expect(result.reviews).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it("AC9: nextCursor 는 마지막으로 반환한 리뷰의 위치를 가리킨다", async () => {
    const rows = [buildRow(1), buildRow(2), buildRow(3)];
    const service = createReviewService(createFakeRepository(rows));

    const result = await service.listByOfficeId("office-1", { limit: 2 });

    expect(result.nextCursor).toBe(
      encodeCursor({ createdAt: rows[1]!.createdAt, id: rows[1]!.id }),
    );
  });

  it("AC11: 커서를 넘기면 그 위치를 repository 에 그대로 전달한다", async () => {
    const rows = [buildRow(1)];
    const repository = createFakeRepository(rows);
    const service = createReviewService(repository);
    const position = { createdAt: rows[0]!.createdAt, id: rows[0]!.id };

    await service.listByOfficeId("office-1", {
      limit: 20,
      cursor: encodeCursor(position),
    });

    expect(repository.findByOfficeId).toHaveBeenCalledWith(
      "office-1",
      21,
      position,
    );
  });

  it("AC9: 상한보다 1건 더 요청해 '다음이 있는지'를 판별한다", async () => {
    const repository = createFakeRepository([]);
    const service = createReviewService(repository);

    await service.listByOfficeId("office-1", { limit: 20 });

    expect(repository.findByOfficeId).toHaveBeenCalledWith(
      "office-1",
      21,
      undefined,
    );
  });

  it("결과가 없으면 빈 배열과 null 커서를 반환한다", async () => {
    const service = createReviewService(createFakeRepository([]));

    const result = await service.listByOfficeId("office-1", { limit: 20 });

    expect(result).toEqual({ reviews: [], nextCursor: null });
  });

  it("AC12: 잘못된 커서면 예외를 던진다 (조용히 첫 페이지로 넘어가지 않는다)", async () => {
    const service = createReviewService(createFakeRepository([]));

    await expect(
      service.listByOfficeId("office-1", { limit: 20, cursor: "broken" }),
    ).rejects.toThrow();
  });
});

describe("reviewService.create (review-write-and-report)", () => {
  it("AC5: 정상 요청이면 작성자 정보가 포함된 리뷰를 반환한다", async () => {
    const repository = createFakeReviewRepository();
    const service = createReviewService(repository);

    const review = await service.create({
      officeId: "office-1",
      authUser: AUTH_USER,
      rating: 5,
      content: CONTENT,
      clientIp: "1.2.3.4",
    });

    expect(review.author).toEqual({
      nickname: AUTH_USER.nickname,
      profileImageUrl: AUTH_USER.profileImageUrl,
    });
  });

  it("AC6: 사무소당 1인 1리뷰 unique 위반이면 DuplicateReviewError 를 던진다", async () => {
    const repository = createFakeReviewRepository();
    repository.insert = async () => {
      throw { code: "23505" };
    };
    const service = createReviewService(repository);

    await expect(
      service.create({
        officeId: "office-1",
        authUser: AUTH_USER,
        rating: 5,
        content: CONTENT,
        clientIp: "1.2.3.4",
      }),
    ).rejects.toThrow(DuplicateReviewError);
  });

  it("AC7: 같은 (IP, 사무소)에 24시간 안의 리뷰가 있으면 ReviewRateLimitedError 를 던진다", async () => {
    const repository = createFakeReviewRepository();
    repository.hasRecentReviewFromIp = async () => true;
    const service = createReviewService(repository);

    await expect(
      service.create({
        officeId: "office-1",
        authUser: AUTH_USER,
        rating: 5,
        content: CONTENT,
        clientIp: "1.2.3.4",
      }),
    ).rejects.toThrow(ReviewRateLimitedError);
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("AC7: 클라이언트 IP를 알 수 없으면(null) rate limit 확인을 건너뛴다", async () => {
    const repository = createFakeReviewRepository();
    const service = createReviewService(repository);

    await service.create({
      officeId: "office-1",
      authUser: AUTH_USER,
      rating: 5,
      content: CONTENT,
      clientIp: null,
    });

    expect(repository.hasRecentReviewFromIp).not.toHaveBeenCalled();
    expect(repository.insert).toHaveBeenCalled();
  });
});

describe("reviewService.create — 거래정보·방문시기 필드 (review-deal-and-visit-fields)", () => {
  it("AC7: 거래정보·방문시기를 채워 보내면 repository.insert에 그대로 전달된다", async () => {
    const repository = createFakeReviewRepository();
    const service = createReviewService(repository);

    await service.create({
      officeId: "office-1",
      authUser: AUTH_USER,
      rating: 5,
      content: CONTENT,
      clientIp: null,
      dealType: "전세",
      dealResult: "계약함",
      visitedYear: 2026,
      visitedMonth: 3,
    });

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        dealType: "전세",
        dealResult: "계약함",
        visitedYear: 2026,
        visitedMonth: 3,
      }),
    );
  });

  it("AC6: 생략하면 repository.insert에 전부 null로 전달된다", async () => {
    const repository = createFakeReviewRepository();
    const service = createReviewService(repository);

    await service.create({
      officeId: "office-1",
      authUser: AUTH_USER,
      rating: 5,
      content: CONTENT,
      clientIp: null,
    });

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        dealType: null,
        dealResult: null,
        visitedYear: null,
        visitedMonth: null,
      }),
    );
  });
});

describe("reviewService.update (review-write-and-report)", () => {
  it("AC9: 존재하지 않는 리뷰면 ReviewNotFoundError 를 던진다", async () => {
    const repository = createFakeReviewRepository();
    const service = createReviewService(repository);

    await expect(
      service.update({
        reviewId: "no-such-review",
        authUser: AUTH_USER,
        rating: 5,
        content: CONTENT,
      }),
    ).rejects.toThrow(ReviewNotFoundError);
  });

  it("AC10: 본인 리뷰가 아니면 ForbiddenReviewActionError 를 던진다", async () => {
    const repository = createFakeReviewRepository();
    repository.findById = async () => buildOwnedRow({ userId: "other-user" });
    const service = createReviewService(repository);

    await expect(
      service.update({
        reviewId: "review-1",
        authUser: AUTH_USER,
        rating: 5,
        content: CONTENT,
      }),
    ).rejects.toThrow(ForbiddenReviewActionError);
  });

  it("AC12: 본인 리뷰면 수정하고 작성자 정보를 포함해 반환한다", async () => {
    const repository = createFakeReviewRepository();
    repository.findById = async () => buildOwnedRow();
    const service = createReviewService(repository);

    const updated = await service.update({
      reviewId: "review-1",
      authUser: AUTH_USER,
      rating: 3,
      content: "수정된 리뷰 내용입니다",
      dealType: null,
      dealResult: null,
      visitedYear: null,
      visitedMonth: null,
    });

    expect(repository.update).toHaveBeenCalledWith("review-1", {
      rating: 3,
      content: "수정된 리뷰 내용입니다",
      dealType: null,
      dealResult: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
    });
    expect(updated.author.nickname).toBe(AUTH_USER.nickname);
  });

  it("AC9(review-deal-and-visit-fields): 생략하면 기존 값이 있었어도 null로 리셋된다(전체교체)", async () => {
    const repository = createFakeReviewRepository();
    repository.findById = async () =>
      buildOwnedRow({
        dealType: "전세",
        dealResult: "계약함",
        visitedYear: 2025,
        visitedMonth: 5,
      });
    const service = createReviewService(repository);

    await service.update({
      reviewId: "review-1",
      authUser: AUTH_USER,
      rating: 3,
      content: "수정된 리뷰 내용입니다",
    });

    expect(repository.update).toHaveBeenCalledWith(
      "review-1",
      expect.objectContaining({
        dealType: null,
        dealResult: null,
        visitedYear: null,
        visitedMonth: null,
      }),
    );
  });
});

describe("reviewService.remove (review-write-and-report)", () => {
  it("AC9: 존재하지 않는 리뷰면 ReviewNotFoundError 를 던진다", async () => {
    const repository = createFakeReviewRepository();
    const service = createReviewService(repository);

    await expect(
      service.remove({ reviewId: "no-such-review", authUser: AUTH_USER }),
    ).rejects.toThrow(ReviewNotFoundError);
  });

  it("AC10: 본인 리뷰가 아니면 ForbiddenReviewActionError 를 던지고 삭제하지 않는다", async () => {
    const repository = createFakeReviewRepository();
    repository.findById = async () => buildOwnedRow({ userId: "other-user" });
    const service = createReviewService(repository);

    await expect(
      service.remove({ reviewId: "review-1", authUser: AUTH_USER }),
    ).rejects.toThrow(ForbiddenReviewActionError);
    expect(repository.deleteById).not.toHaveBeenCalled();
  });

  it("AC13: 본인 리뷰면 삭제한다", async () => {
    const repository = createFakeReviewRepository();
    repository.findById = async () => buildOwnedRow();
    const service = createReviewService(repository);

    await service.remove({ reviewId: "review-1", authUser: AUTH_USER });

    expect(repository.deleteById).toHaveBeenCalledWith("review-1");
  });
});

describe("reviewService.report (review-write-and-report)", () => {
  it("AC15: 존재하지 않는 리뷰면 ReviewNotFoundError 를 던진다", async () => {
    const repository = createFakeReviewRepository();
    const service = createReviewService(repository);

    await expect(
      service.report({ reviewId: "no-such-review", authUser: AUTH_USER }),
    ).rejects.toThrow(ReviewNotFoundError);
  });

  it("AC16: 본인 리뷰를 신고하면 SelfReportError 를 던진다", async () => {
    const repository = createFakeReviewRepository();
    repository.findById = async () => buildOwnedRow({ userId: AUTH_USER.id });
    const service = createReviewService(repository);

    await expect(
      service.report({ reviewId: "review-1", authUser: AUTH_USER }),
    ).rejects.toThrow(SelfReportError);
    expect(repository.insertReport).not.toHaveBeenCalled();
  });

  it("AC17: 이미 신고한 리뷰면(unique 위반) DuplicateReportError 를 던진다", async () => {
    const repository = createFakeReviewRepository();
    repository.findById = async () => buildOwnedRow({ userId: "author" });
    repository.insertReport = async () => {
      throw { code: "23505" };
    };
    const service = createReviewService(repository);

    await expect(
      service.report({ reviewId: "review-1", authUser: AUTH_USER }),
    ).rejects.toThrow(DuplicateReportError);
  });

  it("AC18: 신고가 성공하면 임계치 확인(hideIfThresholdReached)을 호출한다", async () => {
    const repository = createFakeReviewRepository();
    repository.findById = async () => buildOwnedRow({ userId: "author" });
    const service = createReviewService(repository);

    await service.report({ reviewId: "review-1", authUser: AUTH_USER });

    expect(repository.insertReport).toHaveBeenCalledWith(
      "review-1",
      AUTH_USER.id,
    );
    expect(repository.hideIfThresholdReached).toHaveBeenCalledWith(
      "review-1",
      5,
    );
  });
});
