import type { Metadata } from "next";
import Link from "next/link";

import styles from "../legalPage.module.css";

export const metadata: Metadata = { title: "자주 묻는 질문 | 경기도 공인중개사 리뷰" };

/**
 * 이미 구현·검증된 이 저장소의 실제 기능을 설명하는 문답이다 — 원본 문구를 참고하지
 * 않고 이 저장소의 실제 화면·라우트 기준으로 새로 썼다(legal-pages-and-footer 설계 메모).
 */
const FAQS = [
  {
    q: "리뷰를 작성하려면 어떻게 해야 하나요?",
    a: "카카오 계정으로 로그인한 뒤, 지도에서 사무소 마커를 클릭하면 열리는 상세 패널 하단에서 별점·본문(10자 이상)을 입력해 리뷰를 작성할 수 있습니다.",
  },
  {
    q: "작성한 리뷰를 수정하거나 삭제할 수 있나요?",
    a: "네, 본인이 작성한 리뷰에 한해 가능합니다. 마이페이지의 '내 리뷰'에서 항목별로 수정·삭제할 수 있습니다.",
  },
  {
    q: "부적절한 리뷰는 어떻게 신고하나요?",
    a: "각 리뷰 하단의 '신고' 버튼을 누르면 신고 처리됩니다. 신고가 일정 건수 이상 누적되면 해당 리뷰는 자동으로 숨겨집니다.",
  },
  {
    q: '사무소 상세에 "위치 정보 정확도가 낮을 수 있어요"라는 문구가 보여요.',
    a: "사무소 위치는 공공데이터의 주소를 지도 좌표로 자동 변환(지오코딩)해 얻습니다. 이 과정에서 검색 결과의 확신도가 낮았던 사무소에는 이 안내가 함께 표시됩니다.",
  },
  {
    q: "회원 탈퇴 시 내가 작성한 리뷰는 어떻게 되나요?",
    a: "탈퇴 시 계정 정보는 즉시 삭제되며, 작성하신 리뷰는 삭제되지 않고 작성자만 '탈퇴한 사용자'로 익명 처리됩니다. 리뷰를 완전히 지우려면 탈퇴 전에 직접 삭제해주세요.",
  },
];

const FaqPage = () => (
  <>
    <h1 className={styles.title}>자주 묻는 질문</h1>

    <div className={styles.list}>
      {FAQS.map((faq) => (
        <div key={faq.q} className={styles.listItem}>
          <p className={styles.faqQuestion}>Q. {faq.q}</p>
          <p className={styles.faqAnswer}>A. {faq.a}</p>
        </div>
      ))}
    </div>

    <div className={styles.contactPrompt}>
      <p className={styles.contactPromptText}>더 궁금한 점이 있으신가요?</p>
      <Link href="/contact" className={styles.contactPromptLink}>
        문의하기 →
      </Link>
    </div>
  </>
);

export default FaqPage;
