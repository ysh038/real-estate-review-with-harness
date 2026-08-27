"use client";

import type { TMyReview, TUpdateReviewRequest } from "@repo/types";
import { useCallback, useEffect, useState } from "react";

import { deleteReview as deleteReviewRequest, fetchMyReviews, updateReview as updateReviewRequest } from "../lib/reviewsApi";

export interface IUseMyReviewsResult {
  reviews: TMyReview[];
  nextCursor: string | null;
  isLoading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  /** 성공하면 그 id의 항목만 새 값으로 교체한다(review-edit-and-delete-ui AC3). */
  updateReview: (reviewId: string, input: TUpdateReviewRequest) => Promise<void>;
  /** 성공하면 그 id의 항목을 목록에서 제거한다(review-edit-and-delete-ui AC4). */
  deleteReview: (reviewId: string) => Promise<void>;
}

/**
 * 내 리뷰 목록을 불러오고, 본인 리뷰의 수정·삭제도 함께 다룬다
 * (근거: docs/specs/my-reviews-list.md, docs/specs/review-edit-and-delete-ui.md).
 */
export const useMyReviews = (): IUseMyReviewsResult => {
  const [reviews, setReviews] = useState<TMyReview[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchMyReviews({})
      .then((result) => {
        if (isCancelled) return;
        setReviews(result.reviews);
        setNextCursor(result.nextCursor);
      })
      .catch((caught: unknown) => {
        if (isCancelled) return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    const page = await fetchMyReviews({ cursor: nextCursor });
    setReviews((current) => [...current, ...page.reviews]);
    setNextCursor(page.nextCursor);
  }, [nextCursor]);

  const updateReview = useCallback(
    async (reviewId: string, input: TUpdateReviewRequest) => {
      const updated = await updateReviewRequest(reviewId, input);
      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId ? { ...review, ...updated } : review,
        ),
      );
    },
    [],
  );

  const deleteReview = useCallback(async (reviewId: string) => {
    await deleteReviewRequest(reviewId);
    setReviews((current) => current.filter((review) => review.id !== reviewId));
  }, []);

  return {
    reviews,
    nextCursor,
    isLoading,
    error,
    loadMore,
    updateReview,
    deleteReview,
  };
};
