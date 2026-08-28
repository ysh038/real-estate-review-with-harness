import styles from "./FieldRow.module.css";

export interface IFieldRowProps {
  label: string;
  value: string | null | undefined;
  /** value가 null/undefined/빈 문자열이면 이 문구를 대신 보여준다. */
  fallback: string;
}

/**
 * atom (design-system-atoms 명세). `<dl>`로 감싸는 목록 한 줄 — 여러 개를 묶는
 * `<dl>`은 사용하는 쪽(OfficeInfoFields 등)이 감싼다.
 */
export const FieldRow = ({ label, value, fallback }: IFieldRowProps) => (
  <div className={styles.field}>
    <dt className={styles.label}>{label}</dt>
    <dd className={styles.value}>{value ? value : fallback}</dd>
  </div>
);
