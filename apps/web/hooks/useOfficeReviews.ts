"use client";

import type {
  TCreateReviewRequest,
  TOfficeDetailResponse,
  TReview,
  TReviewSort,
} from "@repo/types";
import { useCallback, useEffect, useState } from "react";

import {
  createReview,
  fetchOfficeDetail,
  fetchReviews,
  reportReview as reportReviewRequest,
  ReviewApiError,
  toggleReviewHelpful,
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
  /** 서버 응답으로 그 리뷰 하나만 갱신한다 — 목록 전체를 다시 불러오지 않는다
   * (근거: docs/specs/review-helpful-toggle.md AC13). */
  toggleHelpful: (reviewId: string) => Promise<void>;
  sort: TReviewSort;
  /** 정렬이 바뀌면 처음부터 다시 불러온다 — 커서가 정렬 방향에 종속적이다. */
  setSort: (sort: TReviewSort) => void;
  /** 신고 성공(204) 또는 중복 신고(409) 둘 다 여기 담긴다 — 사용자 입장에선 "이미
   * 신고됨"이라는 같은 결과다 (review-permalink-report-and-sort AC6·AC7). */
  reportedReviewIds: Set<string>;
  reportError: Error | null;
  reportReview: (reviewId: string) => Promise<void>;
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
  const [sort, setSort] = useState<TReviewSort>("latest");
  const [reportedReviewIds, setReportedReviewIds] = useState<Set<string>>(
    new Set(),
  );
  const [reportError, setReportError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    // AC5: 사무소가 바뀌면 이전 것을 들고 있지 않는다 — 화면이 이전 리뷰를 잠깐 보여주면
    // "다른 사무소인데 리뷰가 그대로다"로 오해하기 쉽다. 정렬이 바뀔 때도 마찬가지다 —
    // 커서가 이전 정렬 방향 기준이라 그대로 이어붙이면 순서가 뒤섞인다.
    setDetail(null);
    setReviews([]);
    setNextCursor(null);

    Promise.all([fetchOfficeDetail(officeId), fetchReviews(officeId, { sort })])
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
  }, [officeId, sort]);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    const page = await fetchReviews(officeId, { cursor: nextCursor, sort });
    setReviews((current) => [...current, ...page.reviews]);
    setNextCursor(page.nextCursor);
  }, [officeId, nextCursor, sort]);

  const submitReview = useCallback(
    async (input: TCreateReviewRequest): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await createReview(officeId, input);
        // AC6: 낙관적으로 끼워 넣지 않고 서버 기준으로 다시 불러온다.
        const [detailResult, reviewsResult] = await Promise.all([
          fetchOfficeDetail(officeId),
          fetchReviews(officeId, { sort }),
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
    [officeId, sort],
  );

  const toggleHelpful = useCallback(async (reviewId: string) => {
    const result = await toggleReviewHelpful(reviewId);
    setReviews((current) =>
      current.map((review) =>
        review.id === reviewId
          ? { ...review, helpfulCount: result.helpfulCount, isHelpful: result.isHelpful }
          : review,
      ),
    );
  }, []);

  const reportReview = useCallback(async (reviewId: string) => {
    setReportError(null);
    try {
      await reportReviewRequest(reviewId);
      setReportedReviewIds((current) => new Set(current).add(reviewId));
    } catch (caught) {
      // AC7: 409(중복 신고)는 사용자 입장에서 이미 원하는 결과(신고됨)라 실패로 다루지 않는다.
      if (caught instanceof ReviewApiError && caught.status === 409) {
        setReportedReviewIds((current) => new Set(current).add(reviewId));
        return;
      }
      setReportError(
        caught instanceof Error ? caught : new Error(String(caught)),
      );
    }
  }, []);

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
    toggleHelpful,
    sort,
    setSort,
    reportedReviewIds,
    reportError,
    reportReview,
  };
};
