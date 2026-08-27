import styles from "./ExampleDetail.module.css";

export type TExampleDetailTone = "success" | "warning" | "error" | "info";

export interface IExampleDetailField {
  label: string;
  value: string;
}

export interface IExampleDetailStatus {
  label: string;
  tone: TExampleDetailTone;
}

export interface IExampleDetailProps {
  title: string;
  status?: IExampleDetailStatus;
  fields: readonly IExampleDetailField[];
  onClose: () => void;
}

/**
 * 디자인시스템 참조 구현 — 제목·상태 배지·라벨/값 목록·닫기 버튼으로 이뤄진
 * 정보 카드다. `OfficeInfoFields`/`OfficeDetailPanel`이 실제로 쓰는
 * `<dl><dt><dd>` 레이아웃을 그대로 따른다 — "이 저장소에서 상세 정보는 이렇게
 * 보여준다"는 살아있는 예제 코드다.
 */
export const ExampleDetail = ({ title, status, fields, onClose }: IExampleDetailProps) => (
  <section className={styles.card}>
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>{title}</h3>
        {status ? (
          <span className={`${styles.badge} ${styles[status.tone]}`}>{status.label}</span>
        ) : null}
      </div>
      <button type="button" className={styles.closeButton} onClick={onClose}>
        닫기
      </button>
    </header>
    <dl className={styles.fields}>
      {fields.map((field) => (
        <div className={styles.field} key={field.label}>
          <dt className={styles.label}>{field.label}</dt>
          <dd className={styles.value}>{field.value}</dd>
        </div>
      ))}
    </dl>
  </section>
);
