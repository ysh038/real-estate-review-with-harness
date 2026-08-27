import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../design-system/tokens.css";
import "./globals.css";
import { Footer } from "../components/Footer";
import { LoginButton } from "../components/LoginButton";

export const metadata: Metadata = {
  title: "경기도 공인중개사 리뷰",
  description: "지도에서 공인중개사 사무소를 찾고 실제 이용 경험을 확인하세요.",
};

/**
 * `LoginButton`은 `position: fixed`라 모든 페이지에 동일하게 떠 있어야 한다 — 원래는
 * 홈 화면(`page.tsx`)에만 있어서 `/offices/[id]`에 로그인 수단이 없었다. `/mypage`도
 * 같은 문제라 여기서 전역으로 올린다 (근거: mypage-shell-and-profile 명세).
 */
const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ko">
    <body>
      <LoginButton />
      {children}
      <Footer />
    </body>
  </html>
);

export default RootLayout;
