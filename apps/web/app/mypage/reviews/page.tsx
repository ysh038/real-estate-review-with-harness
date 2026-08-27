"use client";

import styles from "./page.module.css";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { ReviewListSkeleton } from "../../../components/Skeleton";
import { useMyReviews } from "../../../hooks/useMyReviews";

/** `MyReviewsPanel`(모달)을 대체하는 마이페이지 리뷰 탭. 데이터 로직은 그대로 재사용한다. */
const MyPageReviewsPage = () => {
  const { reviews, nextCursor, isLoading, error, loadMore } = useMyReviews();

  return (
    <section>
      <h1 className={styles.title}>내 리뷰</h1>

      {isLoading ? <ReviewListSkeleton /> : null}
      {error ? <ErrorState message="리뷰를 불러오지 못했습니다" /> : null}
      {!isLoading && reviews.length === 0 ? (
        <EmptyState message="아직 작성한 리뷰가 없습니다" />
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
    </section>
  );
};

export default MyPageReviewsPage;
