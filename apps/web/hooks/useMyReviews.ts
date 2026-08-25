"use client";

import type { TMyReview } from "@repo/types";
import { useCallback, useEffect, useState } from "react";

import { fetchMyReviews } from "../lib/reviewsApi";

export interface IUseMyReviewsResult {
  reviews: TMyReview[];
  nextCursor: string | null;
  isLoading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
}

/**
 * 내 리뷰 목록을 불러온다. `useOfficeReviews`와 비슷한 모양이지만 작성 폼이 없어
 * 조회·페이지네이션만 다룬다 (근거: docs/specs/my-reviews-list.md).
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

  return { reviews, nextCursor, isLoading, error, loadMore };
};
