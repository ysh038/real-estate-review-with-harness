"use client";

import styles from "./page.module.css";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { MyReviewItem } from "../../../components/MyReviewItem";
import { ReviewListSkeleton } from "../../../components/Skeleton";
import { Button } from "../../../design-system/components/Button";
import { useMyReviews } from "../../../hooks/useMyReviews";

/** `MyReviewsPanel`(모달)을 대체하는 마이페이지 리뷰 탭. 데이터 로직은 그대로 재사용한다. */
const MyPageReviewsPage = () => {
  const { reviews, nextCursor, isLoading, error, loadMore, updateReview, deleteReview } =
    useMyReviews();

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
          <MyReviewItem
            key={review.id}
            review={review}
            onUpdate={updateReview}
            onDelete={deleteReview}
          />
        ))}
      </ul>

      {nextCursor ? (
        <Button variant="ghost" onClick={() => void loadMore()}>
          더보기
        </Button>
      ) : null}
    </section>
  );
};

export default MyPageReviewsPage;
