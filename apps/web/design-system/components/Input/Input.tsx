import type { InputHTMLAttributes } from "react";

import styles from "./Input.module.css";

export interface IInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  /** aria-label로 쓰인다 — 시각적 라벨은 각 사용처(폼 레이아웃)가 따로 그린다. */
  label: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
  /** "narrow"면 yearInput과 같은 6em 폭이 된다. 기본은 auto(100%). */
  width?: "auto" | "narrow";
}

/** atom (design-system-atoms 명세). */
export const Input = ({
  label,
  type = "text",
  onChange,
  width = "auto",
  className,
  ...props
}: IInputProps) => (
  <input
    type={type}
    aria-label={label}
    onChange={(event) => onChange(event.target.value)}
    className={[
      styles.input,
      width === "narrow" ? styles.narrow : null,
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
);
