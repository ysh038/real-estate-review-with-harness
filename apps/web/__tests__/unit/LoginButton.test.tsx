import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginButton } from "../../components/LoginButton";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("../../hooks/useSession", () => ({ useSession }));

const { MyReviewsPanel } = vi.hoisted(() => ({
  MyReviewsPanel: vi.fn((props: { onClose: () => void }) => (
    <div data-testid="my-reviews-panel-stub">
      <button type="button" onClick={props.onClose}>
        패널 닫기(stub)
      </button>
    </div>
  )),
}));
vi.mock("../../components/MyReviewsPanel", () => ({ MyReviewsPanel }));

const UNAUTHENTICATED_SESSION = {
  status: "unauthenticated" as const,
  user: null,
  logout: vi.fn(),
};

const AUTHENTICATED_SESSION = {
  status: "authenticated" as const,
  user: { id: "u-1", nickname: "홍길동", profileImageUrl: null },
  logout: vi.fn(),
};

describe("LoginButton", () => {
  beforeEach(() => {
    useSession.mockReset();
    MyReviewsPanel.mockClear();
  });

  it("AC9: 비로그인이면 내 리뷰 버튼이 보이지 않는다", () => {
    useSession.mockReturnValue(UNAUTHENTICATED_SESSION);

    render(<LoginButton />);

    expect(
      screen.queryByRole("button", { name: "내 리뷰" }),
    ).not.toBeInTheDocument();
  });

  it("AC9: 로그인 상태면 내 리뷰 버튼이 보인다", () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);

    render(<LoginButton />);

    expect(screen.getByRole("button", { name: "내 리뷰" })).toBeInTheDocument();
  });

  it("AC10: 내 리뷰 버튼을 누르면 패널이 열린다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const user = userEvent.setup();

    render(<LoginButton />);
    await user.click(screen.getByRole("button", { name: "내 리뷰" }));

    expect(screen.getByTestId("my-reviews-panel-stub")).toBeInTheDocument();
  });

  it("패널의 onClose가 호출되면 패널이 닫힌다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const user = userEvent.setup();

    render(<LoginButton />);
    await user.click(screen.getByRole("button", { name: "내 리뷰" }));
    await user.click(screen.getByRole("button", { name: "패널 닫기(stub)" }));

    expect(screen.queryByTestId("my-reviews-panel-stub")).not.toBeInTheDocument();
  });

  it("AC15: 패널이 열린 채로 로그아웃하면(status가 unauthenticated로 바뀌면) 패널이 자동으로 닫힌다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const user = userEvent.setup();

    const { rerender } = render(<LoginButton />);
    await user.click(screen.getByRole("button", { name: "내 리뷰" }));
    expect(screen.getByTestId("my-reviews-panel-stub")).toBeInTheDocument();

    useSession.mockReturnValue(UNAUTHENTICATED_SESSION);
    rerender(<LoginButton />);

    expect(screen.queryByTestId("my-reviews-panel-stub")).not.toBeInTheDocument();
  });
});
