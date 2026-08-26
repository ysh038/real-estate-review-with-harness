import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSession } from "../../hooks/useSession";

const { fetchCurrentUser, logoutRequest, updateNickname } = vi.hoisted(() => ({
  fetchCurrentUser: vi.fn(),
  logoutRequest: vi.fn(),
  updateNickname: vi.fn(),
}));
vi.mock("../../lib/authApi", () => ({ fetchCurrentUser, logoutRequest, updateNickname }));

const USER = { id: "u-1", nickname: "홍길동", profileImageUrl: null };

describe("useSession", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("AC9: 마운트 시 loading → authenticated 로 전환된다", async () => {
    fetchCurrentUser.mockResolvedValue(USER);

    const { result } = renderHook(() => useSession());

    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user).toEqual(USER);
  });

  it("AC8: 비로그인이면 unauthenticated 로 전환되고 user는 null이다", async () => {
    fetchCurrentUser.mockResolvedValue(null);

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.user).toBeNull();
  });

  it("조회 자체가 실패해도 unauthenticated 로 취급한다(빈 화면 방지)", async () => {
    fetchCurrentUser.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
  });

  it("AC10: logout 을 부르면 unauthenticated 로 돌아가고 user가 비워진다", async () => {
    fetchCurrentUser.mockResolvedValue(USER);
    logoutRequest.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutRequest).toHaveBeenCalled();
    expect(result.current.status).toBe("unauthenticated");
    expect(result.current.user).toBeNull();
  });

  it("AC22(mypage-shell-and-profile): updateNickname을 호출하면 user.nickname이 즉시 갱신된다", async () => {
    fetchCurrentUser.mockResolvedValue(USER);
    const updatedUser = { ...USER, nickname: "새닉네임" };
    updateNickname.mockResolvedValue(updatedUser);

    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await act(async () => {
      await result.current.updateNickname("새닉네임");
    });

    expect(updateNickname).toHaveBeenCalledWith("새닉네임");
    expect(result.current.user).toEqual(updatedUser);
  });
});
