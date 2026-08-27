import { VisuallyHidden } from "@repo/ui";

import { Skeleton } from "./Skeleton";
import styles from "./Skeleton.module.css";

export interface IReviewListSkeletonProps {
  count?: number;
}

const ReviewCardSkeleton = () => (
  <div className={styles.card} data-testid="review-skeleton-card" aria-hidden="true">
    <div className={styles.cardHeader}>
      <Skeleton width="30%" height={14} />
      <Skeleton width={70} height={14} />
    </div>
    <Skeleton height={14} />
    <Skeleton width="85%" height={14} />
  </div>
);

/** 리뷰 목록 로딩 중 자리표시자. `ReviewSection`·`/mypage/reviews`가 공유한다
 * (review-ux-consistency-and-draft AC1·AC3·AC6). */
export const ReviewListSkeleton = ({ count = 3 }: IReviewListSkeletonProps) => (
  <div role="status">
    <VisuallyHidden>불러오는 중</VisuallyHidden>
    {Array.from({ length: count }).map((_, index) => (
      <ReviewCardSkeleton key={index} />
    ))}
  </div>
);
