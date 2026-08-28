import type { AnchorHTMLAttributes } from "react";

import type { TButtonSize, TButtonVariant } from "../Button";
import styles from "./LinkButton.module.css";

export interface ILinkButtonProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel"> {
  variant?: TButtonVariant;
  size?: TButtonSize;
  /** true면 target="_blank"와 rel="noopener noreferrer"가 함께 붙는다. */
  external?: boolean;
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
 * atom (design-system-atoms 명세). `Button`과 시각적으로는 같지만 `<a>`로 렌더된다 —
 * contact 페이지의 mailto·외부 링크 버튼이 실제로는 <a>였던 것을 발견해 분리했다.
 * `disabled`가 없다 — <a>는 그 개념 자체를 지원하지 않는다.
 */
export const LinkButton = ({
  variant = "primary",
  size = "md",
  external = false,
  className,
  ...props
}: ILinkButtonProps) => (
  <a
    className={[styles.link, VARIANT_CLASS[variant], SIZE_CLASS[size], className]
      .filter(Boolean)
      .join(" ")}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    {...props}
  />
);
