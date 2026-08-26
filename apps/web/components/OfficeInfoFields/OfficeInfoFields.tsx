import type { TOfficeSummary } from "@repo/types";

import styles from "./OfficeInfoFields.module.css";

const EMPTY_VALUE = "정보 없음";

export interface IOfficeInfoFieldsProps {
  office: TOfficeSummary;
}

/**
 * 대표자명·주소·전화번호를 보여주는 프레젠테이션 컴포넌트.
 * 사무소명(제목)은 각 사용처(패널의 dialog 헤더, 상세 페이지의 h1)가 직접 그린다 —
 * 문맥마다 heading level·마크업이 달라서다.
 * `OfficeDetailPanel`(지도 위 패널)과 `/offices/[id]`(상세 페이지)가 공유한다.
 */
export const OfficeInfoFields = ({ office }: IOfficeInfoFieldsProps) => (
  <dl className={styles.fields}>
    <div className={styles.field}>
      <dt className={styles.label}>대표자명</dt>
      <dd className={styles.value}>{office.ownerName ?? EMPTY_VALUE}</dd>
    </div>
    <div className={styles.field}>
      <dt className={styles.label}>주소</dt>
      <dd className={styles.value}>{office.address}</dd>
    </div>
    <div className={styles.field}>
      <dt className={styles.label}>전화번호</dt>
      <dd className={styles.value}>{office.phone ?? EMPTY_VALUE}</dd>
    </div>
  </dl>
);
