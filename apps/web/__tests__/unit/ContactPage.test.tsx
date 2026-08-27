import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ContactPage from "../../app/contact/page";

describe("ContactPage", () => {
  it("AC10: 이메일 문의·이 저장소 GitHub Issues·FAQ 안내 링크가 보인다", () => {
    render(<ContactPage />);

    expect(screen.getByRole("heading", { name: "문의하기" })).toBeInTheDocument();

    // 이메일 주소 문자열이 화면 텍스트에 노출되지 않는다(크롤러 수집 방지) —
    // 버튼 라벨로 찾고, 실제 동작(mailto:)만 href로 확인한다.
    const emailLink = screen.getByRole("link", { name: "이메일로 문의 보내기" });
    expect(emailLink.getAttribute("href")).toMatch(/^mailto:youje12345@gmail\.com/);
    expect(screen.queryByText(/youje12345@gmail\.com/)).not.toBeInTheDocument();

    const issuesLink = screen.getByRole("link", { name: /GitHub Issues/ });
    expect(issuesLink).toHaveAttribute(
      "href",
      "https://github.com/ysh038/real-estate-review-with-harness/issues/new",
    );

    expect(screen.getByRole("link", { name: /FAQ/ })).toHaveAttribute(
      "href",
      "/legal/faq",
    );
  });
});
