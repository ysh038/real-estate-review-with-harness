import { LOW_MATCH_CONFIDENCE_THRESHOLD, type TOfficeSummary } from "@repo/types";

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
export const OfficeInfoFields = ({ office }: IOfficeInfoFieldsProps) => {
  // null(신뢰도를 모름)은 배지를 안 띄운다 — "낮음"과 "모름"은 다르다
  // (geocoding-match-confidence 설계 메모).
  const isLowConfidence =
    office.matchConfidence != null &&
    office.matchConfidence < LOW_MATCH_CONFIDENCE_THRESHOLD;

  return (
    <dl className={styles.fields}>
      <div className={styles.field}>
        <dt className={styles.label}>대표자명</dt>
        <dd className={styles.value}>{office.ownerName ?? EMPTY_VALUE}</dd>
      </div>
      <div className={styles.field}>
        <dt className={styles.label}>주소</dt>
        <dd className={styles.value}>{office.address}</dd>
        {isLowConfidence ? (
          <p className={styles.lowConfidenceBadge}>위치 정보 정확도가 낮을 수 있어요</p>
        ) : null}
      </div>
      <div className={styles.field}>
        <dt className={styles.label}>전화번호</dt>
        <dd className={styles.value}>{office.phone ?? EMPTY_VALUE}</dd>
      </div>
    </dl>
  );
};
