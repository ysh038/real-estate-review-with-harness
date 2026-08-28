import type { ButtonHTMLAttributes } from "react";

import styles from "./Button.module.css";

export type TButtonVariant = "primary" | "ghost" | "outline" | "danger" | "overlay";
export type TButtonSize = "sm" | "md" | "lg" | "icon";

export interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TButtonVariant;
  size?: TButtonSize;
}

const VARIANT_CLASS: Record<TButtonVariant, string> = {
  primary: styles.primary,
  ghost: styles.ghost,
  outline: styles.outline,
  danger: styles.danger,
  overlay: styles.overlay,
};

const SIZE_CLASS: Record<TButtonSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  icon: styles.icon,
};

/**
 * atom (design-system-atoms 명세). pill 모양 토글 버튼은 이 컴포넌트가 아니라
 * `Chip`이 맡는다 — aria-pressed를 쓰는 기존 버튼 5개가 전부 pill이었다(실측).
 */
export const Button = ({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: IButtonProps) => (
  <button
    type={type}
    className={[styles.button, VARIANT_CLASS[variant], SIZE_CLASS[size], className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);
