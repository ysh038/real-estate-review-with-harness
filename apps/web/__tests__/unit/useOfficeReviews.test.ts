import type { TOfficeDetailResponse, TReview, TReviewListResponse } from "@repo/types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOfficeReviews } from "../../hooks/useOfficeReviews";

const { fetchOfficeDetail, fetchReviews, createReview, toggleReviewHelpful } =
  vi.hoisted(() => ({
    fetchOfficeDetail: vi.fn(),
    fetchReviews: vi.fn(),
    createReview: vi.fn(),
    toggleReviewHelpful: vi.fn(),
  }));
vi.mock("../../lib/reviewsApi", () => ({
  fetchOfficeDetail,
  fetchReviews,
  createReview,
  toggleReviewHelpful,
  ReviewApiError: class ReviewApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const DETAIL: TOfficeDetailResponse = {
  id: "office-1",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
  avgRating: 4.5,
  reviewCount: 2,
  tagCounts: [],
};

const buildReview = (id: string): TReview => ({
  id,
  officeId: "office-1",
  rating: 5,
  content: "충분히 긴 리뷰 본문입니다 열 자 이상",
  author: { nickname: "홍길동", profileImageUrl: null },
  createdAt: "2026-08-21T00:00:00.000Z",
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  helpfulCount: 0,
  isHelpful: false,
});

const PAGE_1: TReviewListResponse = {
  reviews: [buildReview("review-1")],
  nextCursor: "cursor-1",
};

describe("useOfficeReviews", () => {
  beforeEach(() => {
    fetchOfficeDetail.mockReset();
    fetchReviews.mockReset();
    createReview.mockReset();
    toggleReviewHelpful.mockReset();
  });

  it("AC1/AC2: officeId가 주어지면 집계와 첫 페이지를 함께 불러오고 로딩 상태가 끝난다", async () => {
    fetchOfficeDetail.mockResolvedValue(DETAIL);
    fetchReviews.mockResolvedValue(PAGE_1);

    const { result } = renderHook(() => useOfficeReviews("office-1"));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.detail).toEqual(DETAIL);
    expect(result.current.reviews).toEqual(PAGE_1.reviews);
    expect(result.current.nextCursor).toBe("cursor-1");
    expect(fetchReviews).toHaveBeenCalledWith("office-1", {});
  });

  it("AC3: 조회가 실패하면 error가 채워지고 예외를 던지지 않는다", async () => {
    fetchOfficeDetail.mockRejectedValue(new Error("network error"));
    fetchReviews.mockResolvedValue({ reviews: [], nextCursor: null });

    const { result } = renderHook(() => useOfficeReviews("office-1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).not.toBeNull();
  });

  it("AC4: loadMore()를 부르면 다음 페이지를 이어붙인다", async () => {
    fetchOfficeDetail.mockResolvedValue(DETAIL);
    fetchReviews.mockResolvedValueOnce(PAGE_1);
    const { result } = renderHook(() => useOfficeReviews("office-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    fetchReviews.mockResolvedValueOnce({
      reviews: [buildReview("review-2")],
      nextCursor: null,
    });
    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchReviews).toHaveBeenLastCalledWith("office-1", {
      cursor: "cursor-1",
    });
    expect(result.current.reviews.map((r) => r.id)).toEqual([
      "review-1",
      "review-2",
    ]);
    expect(result.current.nextCursor).toBeNull();
  });

  it("AC5: officeId가 바뀌면 이전 상태를 버리고 새로 불러온다", async () => {
    fetchOfficeDetail.mockResolvedValue(DETAIL);
    fetchReviews.mockResolvedValue(PAGE_1);
    const { result, rerender } = renderHook(
      ({ officeId }) => useOfficeReviews(officeId),
      { initialProps: { officeId: "office-1" } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const otherDetail = { ...DETAIL, id: "office-2", reviewCount: 0, avgRating: null };
    fetchOfficeDetail.mockResolvedValue(otherDetail);
    fetchReviews.mockResolvedValue({ reviews: [], nextCursor: null });
    rerender({ officeId: "office-2" });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.detail).toEqual(otherDetail);
    expect(result.current.reviews).toEqual([]);
  });

  it("AC6: 작성이 성공하면 목록·집계를 서버 기준으로 다시 불러온다", async () => {
    fetchOfficeDetail.mockResolvedValue(DETAIL);
    fetchReviews.mockResolvedValue(PAGE_1);
    const { result } = renderHook(() => useOfficeReviews("office-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    createReview.mockResolvedValue(buildReview("review-new"));
    const refreshedDetail = { ...DETAIL, reviewCount: 3 };
    fetchOfficeDetail.mockResolvedValue(refreshedDetail);
    fetchReviews.mockResolvedValue({
      reviews: [buildReview("review-new"), buildReview("review-1")],
      nextCursor: null,
    });

    await act(async () => {
      await result.current.submitReview({ rating: 5, content: "x".repeat(10) });
    });

    expect(result.current.detail).toEqual(refreshedDetail);
    expect(result.current.reviews.map((r) => r.id)).toEqual([
      "review-new",
      "review-1",
    ]);
  });

  it("AC7: 작성이 실패하면 submitError가 채워지고 목록은 그대로다", async () => {
    fetchOfficeDetail.mockResolvedValue(DETAIL);
    fetchReviews.mockResolvedValue(PAGE_1);
    const { result } = renderHook(() => useOfficeReviews("office-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    createReview.mockRejectedValue(new Error("이미 작성했습니다"));

    await act(async () => {
      await result.current.submitReview({ rating: 5, content: "x".repeat(10) });
    });

    expect(result.current.submitError).not.toBeNull();
    expect(result.current.reviews).toEqual(PAGE_1.reviews);
  });

  it("AC13(review-helpful-toggle): toggleHelpful은 서버 응답으로 그 리뷰 하나만 갱신하고 목록을 다시 불러오지 않는다", async () => {
    const page = {
      reviews: [buildReview("review-1"), buildReview("review-2")],
      nextCursor: null,
    };
    fetchOfficeDetail.mockResolvedValue(DETAIL);
    fetchReviews.mockResolvedValue(page);
    const { result } = renderHook(() => useOfficeReviews("office-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    toggleReviewHelpful.mockResolvedValue({ helpfulCount: 1, isHelpful: true });
    const fetchReviewsCallsBefore = fetchReviews.mock.calls.length;

    await act(async () => {
      await result.current.toggleHelpful("review-1");
    });

    expect(toggleReviewHelpful).toHaveBeenCalledWith("review-1");
    expect(fetchReviews.mock.calls.length).toBe(fetchReviewsCallsBefore);
    const updated = result.current.reviews.find((r) => r.id === "review-1");
    const untouched = result.current.reviews.find((r) => r.id === "review-2");
    expect(updated).toMatchObject({ helpfulCount: 1, isHelpful: true });
    expect(untouched).toMatchObject({ helpfulCount: 0, isHelpful: false });
  });
});
