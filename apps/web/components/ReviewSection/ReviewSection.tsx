"use client";

import { REVIEW_CONTENT_MIN_LENGTH } from "@repo/types";
import { useState } from "react";

import styles from "./ReviewSection.module.css";
import { useOfficeReviews } from "../../hooks/useOfficeReviews";
import { useSession } from "../../hooks/useSession";

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

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
  const [formError, setFormError] = useState<string | null>(null);

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
    setFormError(null);

    const wasSubmitted = await submitReview({ rating, content });
    if (wasSubmitted) {
      setRating(0);
      setContent("");
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
