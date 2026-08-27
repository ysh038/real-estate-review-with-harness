import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "../../components/Footer";

describe("Footer", () => {
  it("AC2: 법적·문의 링크 6개가 각각 올바른 경로로 연결된다", () => {
    render(<Footer />);

    const expected: [string, string][] = [
      ["이용약관", "/legal/terms"],
      ["개인정보처리방침", "/legal/privacy"],
      ["위치기반서비스약관", "/legal/location"],
      ["오픈소스", "/legal/oss"],
      ["FAQ", "/legal/faq"],
      ["문의하기", "/contact"],
    ];

    for (const [label, href] of expected) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }
  });

  it("AC3: 저작권 문구와 공공데이터 활용 안내가 보인다", () => {
    render(<Footer />);

    expect(screen.getByText(/경기도 공인중개사 리뷰/)).toBeInTheDocument();
    expect(screen.getByText(/경기데이터드림/)).toBeInTheDocument();
  });
});
