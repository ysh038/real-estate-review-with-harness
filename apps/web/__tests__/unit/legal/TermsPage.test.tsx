import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TermsPage from "../../../app/legal/terms/page";

describe("TermsPage", () => {
  it("AC5: 제목·최종 개정일·준비 중 안내·목차가 보인다", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { name: "이용약관" })).toBeInTheDocument();
    expect(screen.getByText(/최종 개정일/)).toBeInTheDocument();
    expect(screen.getByText(/준비 중/)).toBeInTheDocument();
    expect(screen.getByText("서비스 이용")).toBeInTheDocument();
  });
});
