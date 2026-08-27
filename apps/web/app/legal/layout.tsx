import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./layout.module.css";

/** `/legal/*` 전용 — 지도 화면과 분리된 문서 화면이라 별도로 루트로 돌아가는 링크를 둔다. */
const LegalLayout = ({ children }: { children: ReactNode }) => (
  <div className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.backLink}>
        ← 홈으로
      </Link>
    </header>
    <main className={styles.content}>{children}</main>
  </div>
);

export default LegalLayout;
