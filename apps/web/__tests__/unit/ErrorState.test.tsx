import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErrorState } from "../../components/ErrorState";

describe("ErrorState", () => {
  it("AC2: message를 role=alert로 보여준다", () => {
    render(<ErrorState message="리뷰를 불러오지 못했습니다" />);

    expect(screen.getByRole("alert")).toHaveTextContent("리뷰를 불러오지 못했습니다");
  });
});
