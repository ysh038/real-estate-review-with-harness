import { afterEach, describe, expect, it, vi } from "vitest";

import { buildKakaoLoginUrl, fetchCurrentUser, logoutRequest } from "../../lib/authApi";

describe("fetchCurrentUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC5: 200이면 사용자 정보를 반환하고 credentials: include 를 보낸다", async () => {
    const user = { id: "u-1", nickname: "홍길동", profileImageUrl: null };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(user),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchCurrentUser("http://localhost:8788");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8788/api/me",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(result).toEqual(user);
  });

  it("AC6: 401이면 null 을 반환한다(에러 아님)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCurrentUser("http://localhost:8788")).resolves.toBeNull();
  });

  it("401 외의 실패는 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCurrentUser("http://localhost:8788")).rejects.toThrow();
  });
});

describe("logoutRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC7: POST /api/auth/logout 을 credentials: include 로 부른다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    await logoutRequest("http://localhost:8788");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8788/api/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });
});

describe("buildKakaoLoginUrl", () => {
  it("AC8: /auth/kakao 로 향하는 URL을 만든다", () => {
    expect(buildKakaoLoginUrl("http://localhost:8788")).toBe(
      "http://localhost:8788/auth/kakao",
    );
  });
});
