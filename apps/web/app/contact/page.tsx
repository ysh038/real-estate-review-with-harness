import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.css";

export const metadata: Metadata = { title: "문의하기 | 경기도 공인중개사 리뷰" };

/** 사용자(ysh038)가 실제로 쓰는 연락처 — 원본 프로젝트의 문의 채널과 동일한, 이
 * 서비스의 실제 소유자 이메일이다(가상의 값을 지어내지 않는다). */
const CONTACT_EMAIL = "youje12345@gmail.com";
const ISSUES_URL = "https://github.com/ysh038/real-estate-review-with-harness/issues/new";

const ContactPage = () => (
  <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.backLink}>
        ← 홈으로
      </Link>
    </header>

    <main className={styles.content}>
      <h1 className={styles.title}>문의하기</h1>
      <p className={styles.lead}>서비스 이용 중 궁금한 점이나 불편한 사항을 아래 채널로 알려주세요.</p>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>이메일 문의</h2>
        <p className={styles.cardBody}>
          리뷰 삭제 요청, 사무소 정보 오류 제보, 기타 문의는 이메일로 보내주세요. 영업일
          기준 1~3일 이내에 답변드립니다.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("[경기도 공인중개사 리뷰] 문의")}`}
          className={styles.primaryButton}
        >
          이메일로 문의 보내기
        </a>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>버그 신고 · 개선 제안</h2>
        <p className={styles.cardBody}>
          서비스 오작동이나 UI 개선 아이디어는 GitHub Issues로 남겨주시면 빠르게
          검토합니다.
        </p>
        <a
          href={ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.secondaryButton}
        >
          GitHub Issues 열기
        </a>
      </section>

      <div className={styles.faqPrompt}>
        <p className={styles.faqPromptText}>자주 묻는 질문에서 답을 찾을 수도 있습니다.</p>
        <Link href="/legal/faq" className={styles.faqPromptLink}>
          FAQ 보기 →
        </Link>
      </div>
    </main>
  </div>
);

export default ContactPage;
