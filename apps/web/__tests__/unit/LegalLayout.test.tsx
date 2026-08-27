import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LegalLayout from "../../app/legal/layout";

describe("LegalLayout", () => {
  it("AC4: '← 홈으로' 링크가 루트로 연결되고 children을 그린다", () => {
    render(
      <LegalLayout>
        <p>내용</p>
      </LegalLayout>,
    );

    expect(screen.getByRole("link", { name: "← 홈으로" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText("내용")).toBeInTheDocument();
  });
});
