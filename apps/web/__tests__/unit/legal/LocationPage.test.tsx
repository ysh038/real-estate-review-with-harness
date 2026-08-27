import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LocationPage from "../../../app/legal/location/page";

describe("LocationPage", () => {
  it("AC7: 제목·최종 개정일·위치정보법 고지·준비 중 안내가 보인다", () => {
    render(<LocationPage />);

    expect(
      screen.getByRole("heading", { name: "위치기반서비스 이용약관" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/최종 개정일/)).toBeInTheDocument();
    expect(screen.getAllByText(/위치정보/).length).toBeGreaterThan(0);
    expect(screen.getByText(/카카오 지도/)).toBeInTheDocument();
    expect(screen.getByText(/준비 중/)).toBeInTheDocument();
  });
});
