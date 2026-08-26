"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import styles from "./layout.module.css";
import { RequireAuth } from "../../components/RequireAuth";

const TABS = [
  { href: "/mypage/reviews", label: "리뷰" },
  { href: "/mypage/profile", label: "프로필" },
] as const;

const MyPageLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  return (
    <RequireAuth>
      <div className={styles.page}>
        <nav className={styles.tabs}>
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={isActive ? styles.tabActive : styles.tab}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.content}>{children}</div>
      </div>
    </RequireAuth>
  );
};

export default MyPageLayout;
