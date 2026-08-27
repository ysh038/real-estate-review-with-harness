import type { Metadata } from "next";

import styles from "../legalPage.module.css";

export const metadata: Metadata = { title: "이용약관 | 경기도 공인중개사 리뷰" };

const SECTIONS = [
  "목적 및 정의",
  "회원가입 및 계정",
  "서비스 이용",
  "게시물(리뷰)의 권리와 책임",
  "면책 조항",
  "분쟁 해결 및 준거법",
];

const TermsPage = () => (
  <>
    <h1 className={styles.title}>이용약관</h1>
    <p className={styles.revisionDate}>최종 개정일: 미정 (실서비스 배포 시 확정)</p>

    <div className={`${styles.card} ${styles.preparingCard}`}>
      <p className={styles.preparingTitle}>준비 중</p>
      <p className={styles.preparingBody}>
        실서비스 배포 전 법적 검토를 거쳐 정식 조항을 게재할 예정입니다.
      </p>
    </div>

    <div className={styles.list}>
      {SECTIONS.map((section) => (
        <div key={section} className={styles.listItem}>
          <p className={styles.listItemTitle}>{section}</p>
          <p className={styles.listItemBody}>내용 작성 예정</p>
        </div>
      ))}
    </div>
  </>
);

export default TermsPage;
