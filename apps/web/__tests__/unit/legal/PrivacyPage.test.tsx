import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrivacyPage from "../../../app/legal/privacy/page";

describe("PrivacyPage", () => {
  it("AC6: 실제 수집 항목·목적·보유기간·이용자 권리가 사실대로 보인다", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { name: "개인정보처리방침" }),
    ).toBeInTheDocument();
    // 카카오 프로필 수집 항목
    expect(screen.getByText(/카카오/)).toBeInTheDocument();
    expect(screen.getByText(/닉네임/)).toBeInTheDocument();
    // IP는 해시가 아니라 원문 저장이라는 사실 그대로 — 원본을 베꼈다면 "해시"라고
    // 썼을 부분(설계 메모: apps/api/src/lib/clientIp.ts 직접 확인 결과 해시 없음).
    expect(screen.getByText(/IP 주소/)).toBeInTheDocument();
    expect(screen.queryByText(/IP 해시/)).not.toBeInTheDocument();
    // 보유기간: 탈퇴 시 즉시 삭제 + 리뷰는 익명 보존
    expect(screen.getByText(/즉시 삭제/)).toBeInTheDocument();
    expect(screen.getByText(/익명/)).toBeInTheDocument();
    // 이용자 권리: 실제 라우트 경로
    expect(screen.getByText(/\/mypage\/settings/)).toBeInTheDocument();
  });
});
