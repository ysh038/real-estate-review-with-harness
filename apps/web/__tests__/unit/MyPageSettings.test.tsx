import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MyPageSettingsPage from "../../app/mypage/settings/page";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("../../hooks/useSession", () => ({ useSession }));

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const USER = {
  id: "u-1",
  nickname: "홍길동",
  profileImageUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("MyPageSettingsPage", () => {
  const logout = vi.fn();
  const deleteAccount = vi.fn();

  beforeEach(() => {
    useSession.mockReset();
    push.mockReset();
    logout.mockReset();
    deleteAccount.mockReset();
    useSession.mockReturnValue({
      status: "authenticated",
      user: USER,
      logout,
      updateNickname: vi.fn(),
      deleteAccount,
    });
  });

  it("AC13: 로그아웃 버튼을 누르면 logout 호출 후 홈으로 이동한다", async () => {
    logout.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<MyPageSettingsPage />);
    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(logout).toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("AC14: 회원 탈퇴 버튼을 누르면 확인 모달이 뜨고 안내 문구가 보인다", async () => {
    const user = userEvent.setup();

    render(<MyPageSettingsPage />);
    await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/익명/)).toBeInTheDocument();
  });

  it("AC15: 모달에서 취소하면 닫히고 탈퇴 요청은 나가지 않는다", async () => {
    const user = userEvent.setup();

    render(<MyPageSettingsPage />);
    await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("AC16: 모달에서 확정하면 deleteAccount 호출 후 홈으로 이동한다", async () => {
    deleteAccount.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<MyPageSettingsPage />);
    await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    await user.click(screen.getByRole("button", { name: "탈퇴하기" }));

    expect(deleteAccount).toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("AC17: 탈퇴 요청이 실패하면 에러 메시지가 보이고 로그인 상태를 유지한다(이동하지 않는다)", async () => {
    deleteAccount.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();

    render(<MyPageSettingsPage />);
    await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    await user.click(screen.getByRole("button", { name: "탈퇴하기" }));

    await waitFor(() =>
      expect(screen.getByText("탈퇴 처리에 실패했습니다. 다시 시도해주세요.")).toBeInTheDocument(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("AC18: 처리 중에는 버튼이 비활성화되고 로딩 문구가 보인다", async () => {
    let resolveDelete: (() => void) | undefined;
    deleteAccount.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const user = userEvent.setup();

    render(<MyPageSettingsPage />);
    await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));
    await user.click(screen.getByRole("button", { name: "탈퇴하기" }));

    expect(screen.getByRole("button", { name: "처리 중..." })).toBeDisabled();
    resolveDelete?.();
  });
});
