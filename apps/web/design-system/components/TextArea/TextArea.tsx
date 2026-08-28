import type { TextareaHTMLAttributes } from "react";

import styles from "./TextArea.module.css";

export type TTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** atom (design-system-atoms 명세). 리뷰 작성·수정 폼의 본문 입력에 쓰인다. */
export const TextArea = ({ className, ...props }: TTextAreaProps) => (
  <textarea
    className={[styles.textarea, className].filter(Boolean).join(" ")}
    {...props}
  />
);
