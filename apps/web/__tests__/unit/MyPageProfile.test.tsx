import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MyPageProfilePage from "../../app/mypage/profile/page";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("../../hooks/useSession", () => ({ useSession }));

const USER = {
  id: "u-1",
  nickname: "홍길동",
  profileImageUrl: null,
  createdAt: "2026-03-15T00:00:00.000Z",
};

describe("MyPageProfilePage", () => {
  beforeEach(() => {
    useSession.mockReset();
  });

  it("AC19: 닉네임·가입일·카카오 연동 문구가 보인다", () => {
    useSession.mockReturnValue({
      status: "authenticated",
      user: USER,
      logout: vi.fn(),
      updateNickname: vi.fn(),
    });

    render(<MyPageProfilePage />);

    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("2026년 3월 가입")).toBeInTheDocument();
    expect(screen.getByText("카카오 계정으로 로그인됨")).toBeInTheDocument();
  });

  it("AC20: 수정 버튼을 누르고 저장하면 updateNickname이 호출되고 화면이 즉시 갱신된다", async () => {
    const updateNickname = vi.fn().mockResolvedValue(undefined);
    useSession.mockReturnValue({
      status: "authenticated",
      user: USER,
      logout: vi.fn(),
      updateNickname,
    });
    const user = userEvent.setup();

    render(<MyPageProfilePage />);
    await user.click(screen.getByRole("button", { name: "수정" }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "새닉네임");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(updateNickname).toHaveBeenCalledWith("새닉네임");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("AC21: 닉네임을 빈 값으로 저장하려 하면 에러 문구가 보이고 요청이 나가지 않는다", async () => {
    const updateNickname = vi.fn();
    useSession.mockReturnValue({
      status: "authenticated",
      user: USER,
      logout: vi.fn(),
      updateNickname,
    });
    const user = userEvent.setup();

    render(<MyPageProfilePage />);
    await user.click(screen.getByRole("button", { name: "수정" }));
    await user.clear(screen.getByRole("textbox"));
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText("닉네임을 입력해주세요")).toBeInTheDocument();
    expect(updateNickname).not.toHaveBeenCalled();
  });
});
