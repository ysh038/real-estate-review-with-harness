import { describe, expect, it, vi } from "vitest";

import { encodeCursor } from "../../lib/cursor";
import {
  createReviewService,
  type IReviewRepository,
  type IReviewListRow,
} from "../../services/reviewService";

const buildRow = (index: number): IReviewListRow => ({
  id: `0000000${index}-1111-4222-8333-444455556666`,
  officeId: "office-1",
  rating: 5,
  content: "열 자를 넘기는 충분한 길이의 리뷰 본문입니다",
  nickname: `사용자${index}`,
  profileImageUrl: null,
  createdAt: new Date(`2026-08-${10 + index}T00:00:00.000Z`),
});

const createFakeRepository = (
  rows: IReviewListRow[],
): IReviewRepository => ({
  findByOfficeId: vi.fn(async (_officeId, limit) => rows.slice(0, limit)),
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
