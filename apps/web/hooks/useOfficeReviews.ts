"use client";

import type {
  TCreateReviewRequest,
  TOfficeDetailResponse,
  TReview,
} from "@repo/types";
import { useCallback, useEffect, useState } from "react";

import {
  createReview,
  fetchOfficeDetail,
  fetchReviews,
} from "../lib/reviewsApi";

export interface IUseOfficeReviewsResult {
  detail: TOfficeDetailResponse | null;
  reviews: TReview[];
  nextCursor: string | null;
  isLoading: boolean;
  error: Error | null;
  isSubmitting: boolean;
  submitError: Error | null;
  loadMore: () => Promise<void>;
  /** 성공하면 true, 실패하면(submitError에 이유가 채워진 채) false. */
  submitReview: (input: TCreateReviewRequest) => Promise<boolean>;
}

/**
 * 사무소 집계(avgRating·reviewCount)와 리뷰 목록을 함께 불러오고, 작성을 오케스트레이션한다.
 * 작성 성공 시 목록·집계를 서버 기준으로 다시 불러온다 — 평균 계산 로직을 프론트에
 * 중복시키지 않기 위해서다 (근거: docs/specs/review-list-and-write-ui.md 설계 메모).
 */
export const useOfficeReviews = (
  officeId: string,
): IUseOfficeReviewsResult => {
  const [detail, setDetail] = useState<TOfficeDetailResponse | null>(null);
  const [reviews, setReviews] = useState<TReview[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    // AC5: 사무소가 바뀌면 이전 것을 들고 있지 않는다 — 화면이 이전 리뷰를 잠깐 보여주면
    // "다른 사무소인데 리뷰가 그대로다"로 오해하기 쉽다.
    setDetail(null);
    setReviews([]);
    setNextCursor(null);

    Promise.all([fetchOfficeDetail(officeId), fetchReviews(officeId, {})])
      .then(([detailResult, reviewsResult]) => {
        if (isCancelled) return;
        setDetail(detailResult);
        setReviews(reviewsResult.reviews);
        setNextCursor(reviewsResult.nextCursor);
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
  }, [officeId]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    const page = await fetchReviews(officeId, { cursor: nextCursor });
    setReviews((current) => [...current, ...page.reviews]);
    setNextCursor(page.nextCursor);
  }, [officeId, nextCursor]);

  const submitReview = useCallback(
    async (input: TCreateReviewRequest): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await createReview(officeId, input);
        // AC6: 낙관적으로 끼워 넣지 않고 서버 기준으로 다시 불러온다.
        const [detailResult, reviewsResult] = await Promise.all([
          fetchOfficeDetail(officeId),
          fetchReviews(officeId, {}),
        ]);
        setDetail(detailResult);
        setReviews(reviewsResult.reviews);
        setNextCursor(reviewsResult.nextCursor);
        return true;
      } catch (caught) {
        // AC7: 실패해도 기존 목록·집계는 건드리지 않는다.
        setSubmitError(
          caught instanceof Error ? caught : new Error(String(caught)),
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [officeId],
  );

  return {
    detail,
    reviews,
    nextCursor,
    isLoading,
    error,
    isSubmitting,
    submitError,
    loadMore,
    submitReview,
  };
};
