import styles from "./EmptyState.module.css";

export interface IEmptyStateProps {
  message: string;
}

/** 목록이 0건일 때 공통으로 쓰는 안내 문구(review-ux-consistency-and-draft AC2). */
export const EmptyState = ({ message }: IEmptyStateProps) => (
  <p className={styles.message}>{message}</p>
);
