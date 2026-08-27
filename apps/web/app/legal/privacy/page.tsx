import type { Metadata } from "next";

import styles from "../legalPage.module.css";

export const metadata: Metadata = { title: "개인정보처리방침 | 경기도 공인중개사 리뷰" };

/**
 * 여기 적힌 사실관계는 실서비스 배포 전 검토가 필요한 "조항 문구"가 아니라
 * 이 저장소가 실제로 하는 일을 있는 그대로 서술한 것이다 — 원본 문구를 그대로
 * 가져오지 않는다. 원본은 "IP 해시"라고 쓰지만, 이 저장소는
 * apps/api/src/lib/clientIp.ts·reviews.created_from_ip를 직접 확인한 결과 해시 없이
 * IP 주소를 원문 그대로 저장한다 — 사실과 다른 내용을 게시하지 않기 위해 정확히
 * 그대로 적는다(legal-pages-and-footer 설계 메모).
 */
const FACTS = [
  {
    label: "수집하는 개인정보",
    value: "카카오 계정 프로필(닉네임, 프로필 이미지), 리뷰 작성 시 IP 주소",
  },
  {
    label: "수집 목적",
    value: "리뷰 작성·수정·신고 등 서비스 이용, 같은 사무소에 24시간 내 중복 작성 방지",
  },
  {
    label: "보유 기간",
    value: "회원 탈퇴 시 계정 정보는 즉시 삭제됩니다. 작성한 리뷰는 삭제되지 않고 작성자만 익명으로 처리되어 계속 보관됩니다.",
  },
  {
    label: "제3자 제공",
    value: "원칙적으로 제3자에게 제공하지 않습니다(법령상 의무가 있는 경우 제외).",
  },
  {
    label: "이용자 권리",
    value: "마이페이지 > 설정(/mypage/settings)에서 언제든 회원 탈퇴를 요청할 수 있습니다.",
  },
  {
    label: "개인정보 보호책임자",
    value: "미정 (실서비스 배포 시 지정)",
  },
];

const PrivacyPage = () => (
  <>
    <h1 className={styles.title}>개인정보처리방침</h1>
    <p className={styles.revisionDate}>최종 개정일: 미정 (실서비스 배포 시 확정)</p>

    <div className={styles.list}>
      {FACTS.map((fact) => (
        <div key={fact.label} className={styles.listItem}>
          <p className={styles.listItemTitle}>{fact.label}</p>
          <p className={styles.listItemBody}>{fact.value}</p>
        </div>
      ))}
    </div>
  </>
);

export default PrivacyPage;
