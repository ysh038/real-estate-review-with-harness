import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RequireAuth } from "../../components/RequireAuth";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("../../hooks/useSession", () => ({ useSession }));

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("RequireAuth", () => {
  beforeEach(() => {
    useSession.mockReset();
    replace.mockReset();
  });

  it("AC8: authenticated면 children을 렌더한다", () => {
    useSession.mockReturnValue({ status: "authenticated", user: null, logout: vi.fn() });

    render(
      <RequireAuth>
        <p>보호된 내용</p>
      </RequireAuth>,
    );

    expect(screen.getByText("보호된 내용")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("AC9: unauthenticated면 children을 렌더하지 않고 홈으로 리다이렉트한다", () => {
    useSession.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    render(
      <RequireAuth>
        <p>보호된 내용</p>
      </RequireAuth>,
    );

    expect(screen.queryByText("보호된 내용")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("AC10: loading이면 children도 리다이렉트도 없다", () => {
    useSession.mockReturnValue({ status: "loading", user: null, logout: vi.fn() });

    render(
      <RequireAuth>
        <p>보호된 내용</p>
      </RequireAuth>,
    );

    expect(screen.queryByText("보호된 내용")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
