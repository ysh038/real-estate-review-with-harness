import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../design-system/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "경기도 공인중개사 리뷰",
  description: "지도에서 공인중개사 사무소를 찾고 실제 이용 경험을 확인하세요.",
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ko">
    <body>{children}</body>
  </html>
);

export default RootLayout;
