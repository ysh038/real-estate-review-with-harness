import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ContactPage from "../../app/contact/page";

describe("ContactPage", () => {
  it("AC10: 이메일 문의·이 저장소 GitHub Issues·FAQ 안내 링크가 보인다", () => {
    render(<ContactPage />);

    expect(screen.getByRole("heading", { name: "문의하기" })).toBeInTheDocument();

    const emailLink = screen.getByRole("link", { name: /youje12345@gmail\.com/ });
    expect(emailLink.getAttribute("href")).toMatch(/^mailto:youje12345@gmail\.com/);

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
