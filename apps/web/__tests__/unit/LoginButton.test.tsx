import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginButton } from "../../components/LoginButton";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("../../hooks/useSession", () => ({ useSession }));

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const UNAUTHENTICATED_SESSION = {
  status: "unauthenticated" as const,
  user: null,
  logout: vi.fn(),
  updateNickname: vi.fn(),
};

const buildAuthenticatedSession = (logout = vi.fn()) => ({
  status: "authenticated" as const,
  user: { id: "u-1", nickname: "홍길동", profileImageUrl: null, createdAt: "2026-01-01T00:00:00.000Z" },
  logout,
  updateNickname: vi.fn(),
});

describe("LoginButton", () => {
  beforeEach(() => {
    useSession.mockReset();
    push.mockReset();
  });

  it("비로그인이면 카카오 로그인 링크만 보인다", () => {
    useSession.mockReturnValue(UNAUTHENTICATED_SESSION);

    render(<LoginButton />);

    expect(screen.getByRole("link", { name: "카카오 로그인" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "마이페이지" })).not.toBeInTheDocument();
  });

  it("AC11: 로그인 상태면 /mypage로 가는 '마이페이지' 링크가 보인다", () => {
    useSession.mockReturnValue(buildAuthenticatedSession());

    render(<LoginButton />);

    expect(screen.getByRole("link", { name: "마이페이지" })).toHaveAttribute(
      "href",
      "/mypage",
    );
  });

  it("AC12: 로그아웃 버튼을 누르면 logout 호출 후 홈으로 이동한다", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    useSession.mockReturnValue(buildAuthenticatedSession(logout));
    const user = userEvent.setup();

    render(<LoginButton />);
    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(logout).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });
});
