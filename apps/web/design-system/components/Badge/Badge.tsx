import type { ReactNode } from "react";

import styles from "./Badge.module.css";

export type TBadgeVariant = "tag" | "warning";

export interface IBadgeProps {
  variant?: TBadgeVariant;
  children: ReactNode;
}

const VARIANT_CLASS: Record<TBadgeVariant, string> = {
  tag: styles.tag,
  warning: styles.warning,
};

/**
 * atom (design-system-molecules 명세). 읽기 전용 배지 — 토글 Chip과 역할을 분리한다.
 * tag: 리뷰 태그 표시. warning: 지오코딩 낮은 신뢰도.
 */
export const Badge = ({ variant = "tag", children }: IBadgeProps) => (
  <span className={`${styles.badge} ${VARIANT_CLASS[variant]}`}>{children}</span>
);
