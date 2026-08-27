import styles from "./Skeleton.module.css";

export interface ISkeletonProps {
  width?: string | number;
  height?: string | number;
}

/** shimmer 애니메이션 자리표시자 하나. 실제 정보가 없어 스크린리더엔 노출하지 않는다 —
 * 부모(ReviewListSkeleton 등)가 role="status"로 "불러오는 중"을 한 번만 알린다. */
export const Skeleton = ({ width = "100%", height = 16 }: ISkeletonProps) => (
  <div
    className={styles.skeleton}
    style={{ width, height }}
    aria-hidden="true"
  />
);
