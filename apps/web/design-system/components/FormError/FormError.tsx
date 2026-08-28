import type { ReactNode } from "react";

import styles from "./FormError.module.css";

export interface IFormErrorProps {
  children: ReactNode;
}

/** molecule (design-system-molecules 명세). 폼 검증·제출 실패 문구. */
export const FormError = ({ children }: IFormErrorProps) => (
  <p className={styles.error} role="alert">
    {children}
  </p>
);
