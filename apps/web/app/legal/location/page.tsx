import type { Metadata } from "next";

import styles from "../legalPage.module.css";

export const metadata: Metadata = { title: "위치기반서비스 이용약관 | 경기도 공인중개사 리뷰" };

const LocationPage = () => (
  <>
    <h1 className={styles.title}>위치기반서비스 이용약관</h1>
    <p className={styles.revisionDate}>최종 개정일: 미정 (실서비스 배포 시 확정)</p>

    <div className={styles.noticeCard}>
      <p className={styles.noticeTitle}>위치정보법 관련 고지</p>
      <p className={styles.noticeBody}>
        이 서비스는 카카오 지도 SDK를 이용해 현재 지도 화면 위치를 기준으로 공인중개사
        사무소를 표시합니다. 위치정보의 보호 및 이용 등에 관한 법률에 따라 위치기반서비스
        이용약관을 별도로 제공합니다.
      </p>
    </div>

    <div className={`${styles.card} ${styles.preparingCard}`}>
      <p className={styles.preparingTitle}>준비 중</p>
      <p className={styles.preparingBody}>
        위치정보 이용·제공 사실, 보유·이용기간 등 표준 약관 내용을 실서비스 배포 전에
        게재할 예정입니다.
      </p>
    </div>
  </>
);

export default LocationPage;
