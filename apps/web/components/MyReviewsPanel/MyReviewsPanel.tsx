"use client";

import { useEffect, useId, useRef } from "react";

import styles from "./MyReviewsPanel.module.css";
import { useMyReviews } from "../../hooks/useMyReviews";

export interface IMyReviewsPanelProps {
  onClose: () => void;
}

/**
 * 헤더의 "내 리뷰" 버튼으로 여는 패널. `OfficeDetailPanel`과 달리 지도 상호작용과
 * 경쟁할 이유가 없어 진짜 모달로 만든다 — 배경 클릭·Escape로 닫히고 `aria-modal`을 붙인다
 * (근거: docs/specs/my-reviews-list.md 설계 메모).
 */
export const MyReviewsPanel = ({ onClose }: IMyReviewsPanelProps) => {
  const { reviews, nextCursor, isLoading, error, loadMore } = useMyReviews();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      data-testid="my-reviews-backdrop"
      onClick={onClose}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            내 리뷰
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            닫기
          </button>
        </div>

        {isLoading ? <p className={styles.status}>불러오는 중…</p> : null}
        {error ? (
          <p className={styles.statusError}>리뷰를 불러오지 못했습니다</p>
        ) : null}
        {!isLoading && reviews.length === 0 ? (
          <p className={styles.status}>아직 작성한 리뷰가 없습니다</p>
        ) : null}

        <ul className={styles.list}>
          {reviews.map((review) => (
            <li key={review.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.officeName}>{review.officeName}</span>
                <span className={styles.rating} aria-label={`${review.rating}점`}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
              </div>
              <p className={styles.content}>{review.content}</p>
              {review.isHidden ? (
                <p className={styles.hiddenNotice}>신고 누적으로 숨김</p>
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
      </div>
    </div>
  );
};
