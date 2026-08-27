import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MyPageLayout from "../../app/mypage/layout";

const { RequireAuth } = vi.hoisted(() => ({
  RequireAuth: vi.fn(({ children }: { children: React.ReactNode }) => children),
}));
vi.mock("../../components/RequireAuth", () => ({ RequireAuth }));

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

describe("MyPageLayout", () => {
  it("AC16: 리뷰·프로필 탭 링크가 있고, 현재 탭에 aria-current가 붙는다", () => {
    usePathname.mockReturnValue("/mypage/reviews");

    render(
      <MyPageLayout>
        <p>탭 내용</p>
      </MyPageLayout>,
    );

    expect(screen.getByRole("link", { name: "리뷰" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "프로필" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByText("탭 내용")).toBeInTheDocument();
  });

  it("AC16: /mypage/profile 에서는 프로필 탭이 현재 탭이다", () => {
    usePathname.mockReturnValue("/mypage/profile");

    render(
      <MyPageLayout>
        <p>탭 내용</p>
      </MyPageLayout>,
    );

    expect(screen.getByRole("link", { name: "프로필" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("AC12(member-account-deletion-and-anonymization): 설정 탭 링크가 있고, /mypage/settings에서 현재 탭이다", () => {
    usePathname.mockReturnValue("/mypage/settings");

    render(
      <MyPageLayout>
        <p>탭 내용</p>
      </MyPageLayout>,
    );

    expect(screen.getByRole("link", { name: "설정" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
