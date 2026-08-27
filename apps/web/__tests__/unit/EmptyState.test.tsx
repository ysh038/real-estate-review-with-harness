import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "../../components/EmptyState";

describe("EmptyState", () => {
  it("AC2: message를 그대로 보여준다", () => {
    render(<EmptyState message="아직 리뷰가 없습니다" />);

    expect(screen.getByText("아직 리뷰가 없습니다")).toBeInTheDocument();
  });
});
