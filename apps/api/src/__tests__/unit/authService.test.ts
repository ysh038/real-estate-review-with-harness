import { describe, expect, it, vi } from "vitest";

import type { IKakaoOAuthClient } from "../../lib/kakaoOAuthClient";
import {
  OAuthStateMismatchError,
  createAuthService,
  type IAuthUser,
  type ISessionRepository,
  type ISessionRow,
  type IUserRepository,
} from "../../services/authService";

const PROFILE = { kakaoId: "K1", nickname: "홍길동", profileImageUrl: "https://x/img.png" };
const USER: IAuthUser = { id: "u-1", nickname: "홍길동", profileImageUrl: "https://x/img.png" };

const buildOAuthClient = (overrides: Partial<IKakaoOAuthClient> = {}): IKakaoOAuthClient => ({
  buildAuthorizeUrl: vi.fn((state: string) => `https://kauth.kakao.com/oauth/authorize?state=${state}`),
  exchangeCodeForToken: vi.fn(async () => "access-token"),
  fetchProfile: vi.fn(async () => PROFILE),
  ...overrides,
});

const buildUserRepository = (overrides: Partial<IUserRepository> = {}): IUserRepository => ({
  upsertByKakaoId: vi.fn(async () => USER),
  findById: vi.fn(async () => USER),
  ...overrides,
});

const buildSessionRepository = (
  overrides: Partial<ISessionRepository> = {},
): ISessionRepository & { store: Map<string, ISessionRow> } => {
  const store = new Map<string, ISessionRow>();
  return {
    store,
    create: vi.fn(async (session: ISessionRow) => {
      store.set(session.id, session);
    }),
    findById: vi.fn(async (id: string) => store.get(id) ?? null),
    deleteById: vi.fn(async (id: string) => {
      store.delete(id);
    }),
    ...overrides,
  };
};

describe("authService.handleCallback", () => {
  it("AC3: state 가 일치하지 않으면 토큰 교환을 시도하지 않고 거부한다", async () => {
    const oauthClient = buildOAuthClient();
    const service = createAuthService({
      oauthClient,
      userRepository: buildUserRepository(),
      sessionRepository: buildSessionRepository(),
    });

    await expect(
      service.handleCallback({ code: "c", state: "wrong", expectedState: "correct" }),
    ).rejects.toBeInstanceOf(OAuthStateMismatchError);
    expect(oauthClient.exchangeCodeForToken).not.toHaveBeenCalled();
  });

  it("AC3: 쿠키에 저장된 state 가 없으면(만료 등) 거부한다", async () => {
    const oauthClient = buildOAuthClient();
    const service = createAuthService({
      oauthClient,
      userRepository: buildUserRepository(),
      sessionRepository: buildSessionRepository(),
    });

    await expect(
      service.handleCallback({ code: "c", state: "any", expectedState: undefined }),
    ).rejects.toBeInstanceOf(OAuthStateMismatchError);
  });

  it("AC1: 카카오 프로필로 사용자를 upsert 하고 세션을 발급한다", async () => {
    const userRepository = buildUserRepository();
    const sessionRepository = buildSessionRepository();
    const service = createAuthService({
      oauthClient: buildOAuthClient(),
      userRepository,
      sessionRepository,
    });

    const result = await service.handleCallback({
      code: "auth-code",
      state: "s",
      expectedState: "s",
    });

    expect(userRepository.upsertByKakaoId).toHaveBeenCalledWith(PROFILE);
    expect(sessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER.id, id: result.sessionId }),
    );
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("AC4: 토큰 교환이 실패하면 세션을 만들지 않는다", async () => {
    const sessionRepository = buildSessionRepository();
    const oauthClient = buildOAuthClient({
      exchangeCodeForToken: vi.fn(async () => {
        throw new Error("카카오 토큰 교환 실패: HTTP 400");
      }),
    });
    const service = createAuthService({
      oauthClient,
      userRepository: buildUserRepository(),
      sessionRepository,
    });

    await expect(
      service.handleCallback({ code: "bad-code", state: "s", expectedState: "s" }),
    ).rejects.toThrow("카카오 토큰 교환 실패");
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  it("AC4: 프로필 조회가 실패해도 세션을 만들지 않는다", async () => {
    const sessionRepository = buildSessionRepository();
    const oauthClient = buildOAuthClient({
      fetchProfile: vi.fn(async () => {
        throw new Error("카카오 프로필 조회 실패: HTTP 401");
      }),
    });
    const service = createAuthService({
      oauthClient,
      userRepository: buildUserRepository(),
      sessionRepository,
    });

    await expect(
      service.handleCallback({ code: "c", state: "s", expectedState: "s" }),
    ).rejects.toThrow("카카오 프로필 조회 실패");
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });
});

describe("authService.getUserBySessionId", () => {
  it("AC5: 유효한 세션이면 사용자를 반환한다", async () => {
    const sessionRepository = buildSessionRepository();
    await sessionRepository.create({
      id: "sess-1",
      userId: USER.id,
      expiresAt: new Date(Date.now() + 1000 * 60),
    });
    const service = createAuthService({
      oauthClient: buildOAuthClient(),
      userRepository: buildUserRepository(),
      sessionRepository,
    });

    await expect(service.getUserBySessionId("sess-1")).resolves.toEqual(USER);
  });

  it("AC6: 세션이 없으면 null 을 반환한다", async () => {
    const service = createAuthService({
      oauthClient: buildOAuthClient(),
      userRepository: buildUserRepository(),
      sessionRepository: buildSessionRepository(),
    });

    await expect(service.getUserBySessionId("no-such-session")).resolves.toBeNull();
  });

  it("AC6: 세션이 만료됐으면 null 을 반환한다", async () => {
    const sessionRepository = buildSessionRepository();
    await sessionRepository.create({
      id: "expired",
      userId: USER.id,
      expiresAt: new Date(Date.now() - 1000),
    });
    const service = createAuthService({
      oauthClient: buildOAuthClient(),
      userRepository: buildUserRepository(),
      sessionRepository,
    });

    await expect(service.getUserBySessionId("expired")).resolves.toBeNull();
  });
});

describe("authService.logout", () => {
  it("AC7: 로그아웃하면 세션이 무효화되고 이후 조회는 null 이다", async () => {
    const sessionRepository = buildSessionRepository();
    await sessionRepository.create({
      id: "sess-1",
      userId: USER.id,
      expiresAt: new Date(Date.now() + 1000 * 60),
    });
    const service = createAuthService({
      oauthClient: buildOAuthClient(),
      userRepository: buildUserRepository(),
      sessionRepository,
    });

    await service.logout("sess-1");

    await expect(service.getUserBySessionId("sess-1")).resolves.toBeNull();
  });
});
