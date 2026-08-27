"use client";

import type { TMyReview, TUpdateReviewRequest } from "@repo/types";
import { useCallback, useEffect, useState } from "react";

import {
  deleteReview as deleteReviewRequest,
  fetchMyReviews,
  updateReview as updateReviewRequest,
  uploadPhoto,
} from "../lib/reviewsApi";

export interface IUseMyReviewsResult {
  reviews: TMyReview[];
  nextCursor: string | null;
  isLoading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  /**
   * 성공하면 그 id의 항목만 새 값으로 교체한다(review-edit-and-delete-ui AC3).
   * `newPhotoFiles`가 있으면 먼저 순차 업로드해 그 storageKey들을
   * `input.photoKeys` 뒤에 이어붙인 뒤 PATCH한다 — 하나라도 실패하면 PATCH
   * 자체를 보내지 않는다(review-edit-photo-changes AC1~AC3).
   */
  updateReview: (
    reviewId: string,
    input: TUpdateReviewRequest,
    newPhotoFiles?: File[],
  ) => Promise<void>;
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
    async (
      reviewId: string,
      input: TUpdateReviewRequest,
      newPhotoFiles: File[] = [],
    ) => {
      // 작성 폼(useOfficeReviews.submitReview)과 동일한 원칙 — 새 파일을 순차
      // 업로드하고, 하나라도 실패하면 PATCH 자체를 보내지 않는다.
      const uploadedKeys: string[] = [];
      for (const file of newPhotoFiles) {
        const { storageKey } = await uploadPhoto(file);
        uploadedKeys.push(storageKey);
      }
      const finalInput: TUpdateReviewRequest =
        uploadedKeys.length > 0
          ? { ...input, photoKeys: [...(input.photoKeys ?? []), ...uploadedKeys] }
          : input;

      const updated = await updateReviewRequest(reviewId, finalInput);
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
