import type { TMyReview, TMyReviewListResponse } from "@repo/types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMyReviews } from "../../hooks/useMyReviews";

const { fetchMyReviews } = vi.hoisted(() => ({
  fetchMyReviews: vi.fn(),
}));
vi.mock("../../lib/reviewsApi", () => ({
  fetchMyReviews,
  ReviewApiError: class ReviewApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const buildMyReview = (id: string): TMyReview => ({
  id,
  officeId: "office-1",
  officeName: "분당공인중개사사무소",
  rating: 5,
  content: "충분히 긴 리뷰 본문입니다 열 자 이상",
  author: { nickname: "홍길동", profileImageUrl: null },
  createdAt: "2026-08-21T00:00:00.000Z",
  isHidden: false,
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  helpfulCount: 0,
  isHelpful: false,
});

const PAGE_1: TMyReviewListResponse = {
  reviews: [buildMyReview("review-1")],
  nextCursor: "cursor-1",
};

describe("useMyReviews", () => {
  beforeEach(() => {
    fetchMyReviews.mockReset();
  });

  it("마운트되면 내 리뷰 목록을 불러오고 로딩 상태가 끝난다", async () => {
    fetchMyReviews.mockResolvedValue(PAGE_1);

    const { result } = renderHook(() => useMyReviews());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toEqual(PAGE_1.reviews);
    expect(result.current.nextCursor).toBe("cursor-1");
    expect(fetchMyReviews).toHaveBeenCalledWith({});
  });

  it("조회가 실패하면 error가 채워지고 예외를 던지지 않는다", async () => {
    fetchMyReviews.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useMyReviews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).not.toBeNull();
  });

  it("loadMore()를 부르면 다음 페이지를 이어붙인다", async () => {
    fetchMyReviews.mockResolvedValueOnce(PAGE_1);
    const { result } = renderHook(() => useMyReviews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    fetchMyReviews.mockResolvedValueOnce({
      reviews: [buildMyReview("review-2")],
      nextCursor: null,
    });
    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchMyReviews).toHaveBeenLastCalledWith({ cursor: "cursor-1" });
    expect(result.current.reviews.map((r) => r.id)).toEqual([
      "review-1",
      "review-2",
    ]);
    expect(result.current.nextCursor).toBeNull();
  });

  it("리뷰가 없으면 빈 배열을 유지한다", async () => {
    fetchMyReviews.mockResolvedValue({ reviews: [], nextCursor: null });

    const { result } = renderHook(() => useMyReviews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toEqual([]);
  });
});
