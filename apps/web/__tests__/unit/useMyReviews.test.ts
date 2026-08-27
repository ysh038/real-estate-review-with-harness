import type { TMyReview, TMyReviewListResponse } from "@repo/types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMyReviews } from "../../hooks/useMyReviews";

const { fetchMyReviews, updateReview, deleteReview, uploadPhoto } = vi.hoisted(() => ({
  fetchMyReviews: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
  uploadPhoto: vi.fn(),
}));
vi.mock("../../lib/reviewsApi", () => ({
  fetchMyReviews,
  updateReview,
  deleteReview,
  uploadPhoto,
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
  expertise: null,
  defectResponse: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  photos: [],
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
    updateReview.mockReset();
    deleteReview.mockReset();
    uploadPhoto.mockReset();
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

  it("AC3(review-edit-and-delete-ui): updateReview 성공 시 그 id의 항목만 새 값으로 교체된다", async () => {
    fetchMyReviews.mockResolvedValue({
      reviews: [buildMyReview("review-1"), buildMyReview("review-2")],
      nextCursor: null,
    });
    const { result } = renderHook(() => useMyReviews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updated = { ...buildMyReview("review-1"), rating: 1 };
    updateReview.mockResolvedValue(updated);

    await act(async () => {
      await result.current.updateReview("review-1", { rating: 1, content: updated.content });
    });

    expect(result.current.reviews.find((r) => r.id === "review-1")?.rating).toBe(1);
    expect(result.current.reviews.find((r) => r.id === "review-2")?.rating).toBe(5);
    expect(result.current.reviews).toHaveLength(2);
  });

  it("AC1(review-edit-photo-changes): newPhotoFiles 생략 시 업로드 없이 input 그대로 PATCH된다", async () => {
    fetchMyReviews.mockResolvedValue(PAGE_1);
    const { result } = renderHook(() => useMyReviews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const input = { rating: 4, content: "충분히 긴 리뷰 본문입니다 열 자 이상", photoKeys: [] };
    updateReview.mockResolvedValue({ ...buildMyReview("review-1"), ...input });

    await act(async () => {
      await result.current.updateReview("review-1", input);
    });

    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(updateReview).toHaveBeenCalledWith("review-1", input);
  });

  it("AC2(review-edit-photo-changes): newPhotoFiles가 있으면 순차 업로드 후 photoKeys 뒤에 이어붙여 PATCH된다", async () => {
    fetchMyReviews.mockResolvedValue(PAGE_1);
    const { result } = renderHook(() => useMyReviews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    uploadPhoto
      .mockResolvedValueOnce({ storageKey: "new-key-1" })
      .mockResolvedValueOnce({ storageKey: "new-key-2" });
    updateReview.mockResolvedValue(buildMyReview("review-1"));

    const input = {
      rating: 4,
      content: "충분히 긴 리뷰 본문입니다 열 자 이상",
      photoKeys: ["kept-key-1"],
    };
    const fileA = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const fileB = new File(["b"], "b.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.updateReview("review-1", input, [fileA, fileB]);
    });

    expect(uploadPhoto).toHaveBeenNthCalledWith(1, fileA);
    expect(uploadPhoto).toHaveBeenNthCalledWith(2, fileB);
    expect(updateReview).toHaveBeenCalledWith("review-1", {
      ...input,
      photoKeys: ["kept-key-1", "new-key-1", "new-key-2"],
    });
  });

  it("AC3(review-edit-photo-changes): 업로드가 실패하면 PATCH를 보내지 않고 예외를 던진다", async () => {
    fetchMyReviews.mockResolvedValue(PAGE_1);
    const { result } = renderHook(() => useMyReviews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    uploadPhoto.mockRejectedValue(new Error("upload failed"));
    const file = new File(["a"], "a.jpg", { type: "image/jpeg" });

    await expect(
      result.current.updateReview(
        "review-1",
        { rating: 4, content: "충분히 긴 리뷰 본문입니다 열 자 이상", photoKeys: [] },
        [file],
      ),
    ).rejects.toThrow();

    expect(updateReview).not.toHaveBeenCalled();
  });

  it("AC4(review-edit-and-delete-ui): deleteReview 성공 시 그 id의 항목이 제거된다", async () => {
    fetchMyReviews.mockResolvedValue({
      reviews: [buildMyReview("review-1"), buildMyReview("review-2")],
      nextCursor: null,
    });
    const { result } = renderHook(() => useMyReviews());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    deleteReview.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.deleteReview("review-1");
    });

    expect(result.current.reviews.map((r) => r.id)).toEqual(["review-2"]);
  });
});
