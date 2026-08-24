"use client";

import {
  DEAL_RESULTS,
  DEAL_TYPES,
  REVIEW_CONTENT_MIN_LENGTH,
  REVIEW_TAGS,
  type TReview,
  type TReviewTag,
} from "@repo/types";
import { useState } from "react";

import styles from "./ReviewSection.module.css";
import { useOfficeReviews } from "../../hooks/useOfficeReviews";
import { useSession } from "../../hooks/useSession";

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const NOT_SELECTED = "";

/** 거래유형·거래결과·방문시기 중 있는 것만 "·"로 이어 붙인다. 전부 없으면 null. */
const formatDealInfo = (review: TReview): string | null => {
  const parts = [
    review.dealType,
    review.dealResult,
    review.visitedYear != null && review.visitedMonth != null
      ? `${review.visitedYear}년 ${review.visitedMonth}월`
      : null,
  ].filter((part): part is string => part != null);
  return parts.length > 0 ? parts.join(" · ") : null;
};

export interface IReviewSectionProps {
  officeId: string;
}

/**
 * 사무소 상세 패널 안에 붙는 리뷰 목록 + 작성 폼. 세션(누가 로그인했는지)과 리뷰 데이터는
 * 서로 다른 관심사라 훅을 따로 쓴다 (근거: docs/specs/review-list-and-write-ui.md 설계 메모).
 */
export const ReviewSection = ({ officeId }: IReviewSectionProps) => {
  const { status } = useSession();
  const {
    detail,
    reviews,
    nextCursor,
    isLoading,
    error,
    isSubmitting,
    submitError,
    loadMore,
    submitReview,
  } = useOfficeReviews(officeId);

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [dealType, setDealType] = useState<string>(NOT_SELECTED);
  const [dealResult, setDealResult] = useState<string>(NOT_SELECTED);
  const [visitedYear, setVisitedYear] = useState<string>("");
  const [visitedMonth, setVisitedMonth] = useState<string>(NOT_SELECTED);
  const [selectedTags, setSelectedTags] = useState<TReviewTag[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleTag = (tag: TReviewTag) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((selected) => selected !== tag)
        : [...current, tag],
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (rating < 1) {
      setFormError("별점을 선택해주세요");
      return;
    }
    if (content.trim().length < REVIEW_CONTENT_MIN_LENGTH) {
      setFormError(`본문은 ${REVIEW_CONTENT_MIN_LENGTH}자 이상 입력해주세요`);
      return;
    }
    // AC5(review-deal-and-visit-fields): 방문 연도와 월은 함께 있거나 함께 없어야 한다.
    if ((visitedYear === "") !== (visitedMonth === NOT_SELECTED)) {
      setFormError("방문 연도와 방문 월은 함께 입력하거나 함께 비워주세요");
      return;
    }
    setFormError(null);

    const wasSubmitted = await submitReview({
      rating,
      content,
      ...(dealType !== NOT_SELECTED && {
        dealType: dealType as (typeof DEAL_TYPES)[number],
      }),
      ...(dealResult !== NOT_SELECTED && {
        dealResult: dealResult as (typeof DEAL_RESULTS)[number],
      }),
      ...(visitedYear !== "" && { visitedYear: Number(visitedYear) }),
      ...(visitedMonth !== NOT_SELECTED && { visitedMonth: Number(visitedMonth) }),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
    });
    if (wasSubmitted) {
      setRating(0);
      setContent("");
      setDealType(NOT_SELECTED);
      setDealResult(NOT_SELECTED);
      setVisitedYear("");
      setVisitedMonth(NOT_SELECTED);
      setSelectedTags([]);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.summary}>
        {detail && detail.reviewCount > 0 ? (
          <p className={styles.summaryText}>
            ★ {detail.avgRating} · 리뷰 {detail.reviewCount}개
          </p>
        ) : (
          <p className={styles.summaryText}>아직 리뷰가 없습니다</p>
        )}
        {detail && detail.tagCounts.length > 0 ? (
          <ul className={styles.tagList}>
            {detail.tagCounts.map(({ tag, count }) => (
              <li key={tag} className={styles.tagBadge}>
                {tag} {count}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {isLoading ? <p className={styles.status}>불러오는 중…</p> : null}
      {error ? (
        <p className={styles.statusError}>리뷰를 불러오지 못했습니다</p>
      ) : null}

      <ul className={styles.list}>
        {reviews.map((review) => (
          <li key={review.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <span className={styles.nickname}>{review.author.nickname}</span>
              <span className={styles.rating} aria-label={`${review.rating}점`}>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
            </div>
            <p className={styles.content}>{review.content}</p>
            {formatDealInfo(review) ? (
              <p className={styles.dealInfo}>{formatDealInfo(review)}</p>
            ) : null}
            {review.tags.length > 0 ? (
              <ul className={styles.tagList}>
                {review.tags.map((tag) => (
                  <li key={tag} className={styles.tagBadge}>
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {nextCursor ? (
        <button
          type="button"
          className={styles.loadMoreButton}
          onClick={() => void loadMore()}
        >
          더보기
        </button>
      ) : null}

      {status === "authenticated" ? (
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          <div className={styles.ratingInput} role="radiogroup" aria-label="별점">
            {RATING_OPTIONS.map((option) => (
              <label key={option} className={styles.ratingLabel}>
                <input
                  type="radio"
                  name="rating"
                  value={option}
                  checked={rating === option}
                  onChange={() => setRating(option)}
                  aria-label={`${option}점`}
                />
                {option}
              </label>
            ))}
          </div>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="이용 경험을 10자 이상 남겨주세요"
          />
          <div className={styles.dealFields}>
            <select
              className={styles.dealSelect}
              aria-label="거래유형"
              value={dealType}
              onChange={(event) => setDealType(event.target.value)}
            >
              <option value={NOT_SELECTED}>선택 안 함</option>
              {DEAL_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className={styles.dealSelect}
              aria-label="거래결과"
              value={dealResult}
              onChange={(event) => setDealResult(event.target.value)}
            >
              <option value={NOT_SELECTED}>선택 안 함</option>
              {DEAL_RESULTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              type="number"
              className={styles.yearInput}
              aria-label="방문 연도"
              placeholder="방문 연도"
              value={visitedYear}
              onChange={(event) => setVisitedYear(event.target.value)}
            />
            <select
              className={styles.dealSelect}
              aria-label="방문 월"
              value={visitedMonth}
              onChange={(event) => setVisitedMonth(event.target.value)}
            >
              <option value={NOT_SELECTED}>선택 안 함</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>
          </div>
          <div className={styles.tagChipGroup} role="group" aria-label="태그">
            {REVIEW_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={
                  selectedTags.includes(tag)
                    ? `${styles.tagChip} ${styles.tagChipSelected}`
                    : styles.tagChip
                }
                aria-pressed={selectedTags.includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          {formError ? (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          ) : null}
          {!formError && submitError ? (
            <p className={styles.formError} role="alert">
              {submitError.message}
            </p>
          ) : null}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            등록
          </button>
        </form>
      ) : (
        <p className={styles.loginPrompt}>로그인하면 리뷰를 남길 수 있어요</p>
      )}
    </section>
  );
};
