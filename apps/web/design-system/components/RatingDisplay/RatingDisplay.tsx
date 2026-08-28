import styles from "./RatingDisplay.module.css";

export interface IRatingDisplayProps {
  value: number;
}

/** molecule (design-system-molecules 명세). 읽기 전용 별점 표시. */
export const RatingDisplay = ({ value }: IRatingDisplayProps) => (
  <span className={styles.rating} aria-label={`${value}점`}>
    {"★".repeat(value)}
    {"☆".repeat(5 - value)}
  </span>
);
