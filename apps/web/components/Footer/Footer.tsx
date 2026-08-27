import Link from "next/link";

import styles from "./Footer.module.css";

const LEGAL_LINKS = [
  { href: "/legal/terms", label: "이용약관" },
  { href: "/legal/privacy", label: "개인정보처리방침" },
  { href: "/legal/location", label: "위치기반서비스약관" },
  { href: "/legal/oss", label: "오픈소스" },
  { href: "/legal/faq", label: "FAQ" },
  { href: "/contact", label: "문의하기" },
] as const;

/** 모든 페이지 하단에 공통으로 붙는 법적·문의 링크 모음. 지도 화면처럼 뷰포트를
 * 채우는 페이지에서는 스크롤해야 보인다(legal-pages-and-footer 설계 메모). */
export const Footer = () => (
  <footer className={styles.footer}>
    <nav className={styles.links} aria-label="법적 고지 및 문의">
      {LEGAL_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={styles.link}>
          {link.label}
        </Link>
      ))}
    </nav>
    <p className={styles.copyright}>
      © 2026 경기도 공인중개사 리뷰. 본 서비스는 공공데이터(경기데이터드림)를 활용합니다.
    </p>
  </footer>
);
