import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FaqPage from "../../../app/legal/faq/page";

describe("FaqPage", () => {
  it("AC9: 이 저장소의 실제 기능을 설명하는 문답과 문의하기 링크가 보인다", () => {
    render(<FaqPage />);

    expect(
      screen.getByRole("heading", { name: "자주 묻는 질문" }),
    ).toBeInTheDocument();
    // 실제 기능 기준 문답 — 신고, 낮은 신뢰도 배지, 탈퇴 시 익명화
    expect(screen.getAllByText(/신고/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/정확도가 낮을 수 있어요|위치 정보 정확도/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/익명/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /문의/ })).toHaveAttribute(
      "href",
      "/contact",
    );
  });
});
