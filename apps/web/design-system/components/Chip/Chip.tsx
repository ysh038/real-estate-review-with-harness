import type { ReactNode } from "react";

import styles from "./Chip.module.css";

export interface IChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * atom (design-system-atoms 명세). pill 모양 토글 버튼 — 태그·카테고리 필터·정렬·
 * 도움돼요처럼 aria-pressed를 쓰는 기존 버튼 5개가 전부 이 모양이었다(실측).
 */
export const Chip = ({ selected, onToggle, children, disabled }: IChipProps) => (
  <button
    type="button"
    aria-pressed={selected}
    disabled={disabled}
    className={selected ? `${styles.chip} ${styles.selected}` : styles.chip}
    onClick={onToggle}
  >
    {children}
  </button>
);
