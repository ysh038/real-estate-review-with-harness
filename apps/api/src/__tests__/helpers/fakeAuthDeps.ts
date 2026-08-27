import { vi } from "vitest";

import type { IKakaoOAuthClient } from "../../lib/kakaoOAuthClient";
import type {
  IAuthUser,
  ISessionRepository,
  ISessionRow,
  IUserRepository,
} from "../../services/authService";

export const createFakeKakaoOAuthClient = (
  overrides: Partial<IKakaoOAuthClient> = {},
): IKakaoOAuthClient => ({
  buildAuthorizeUrl: vi.fn(
    (state: string) => `https://kauth.kakao.com/oauth/authorize?state=${state}`,
  ),
  exchangeCodeForToken: vi.fn(async () => "fake-access-token"),
  fetchProfile: vi.fn(async () => ({
    kakaoId: "K1",
    nickname: "홍길동",
    profileImageUrl: null,
  })),
  ...overrides,
});

/**
 * `current`로 지금 저장된 사용자 정보를 노출한다 — updateNickname 테스트가 갱신 후
 * 값을 직접 확인할 수 있게 한다(mypage-shell-and-profile AC7과 대응).
 */
export const createFakeUserRepository = (
  user: IAuthUser = {
    id: "u-1",
    nickname: "홍길동",
    profileImageUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
): IUserRepository & { current: IAuthUser } => {
  let current = user;
  // 실 DB의 하드 삭제를 흉내낸다 — delete 이후엔 findById가 더는 이 사용자를 못 찾는다.
  let isDeleted = false;
  return {
    get current() {
      return current;
    },
    upsertByKakaoId: vi.fn(async () => current),
    findById: vi.fn(async (id: string) =>
      !isDeleted && id === current.id ? current : null,
    ),
    updateNickname: vi.fn(async (id: string, nickname: string) => {
      if (id !== current.id) {
        throw new Error("존재하지 않는 사용자의 닉네임을 갱신하려 했습니다");
      }
      current = { ...current, nickname };
      return current;
    }),
    delete: vi.fn(async (id: string) => {
      if (id === current.id) isDeleted = true;
    }),
  };
};

/**
 * 실제 DB 세션 테이블을 흉내낸 인메모리 저장소. `store` 를 노출해 테스트가 세션을
 * 미리 심어두거나(로그인된 상태 흉내) 삭제 여부를 직접 확인할 수 있게 한다.
 */
export const createFakeSessionRepository = (): ISessionRepository & {
  store: Map<string, ISessionRow>;
} => {
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
  };
};

/**
 * createApp 이 요구하는 auth 관련 deps의 기본 fake 세트. officesRoute·health·cors 처럼
 * 인증과 무관한 테스트가 매번 5개 필드를 반복 채우지 않도록 한다.
 */
export const createFakeAuthAppDeps = () => ({
  oauthClient: createFakeKakaoOAuthClient(),
  userRepository: createFakeUserRepository(),
  sessionRepository: createFakeSessionRepository(),
  webBaseUrl: "http://localhost:3000",
  isProduction: false,
  /** 기본은 "관리자 기능 꺼짐" — admin 라우트를 테스트하는 곳에서만 override한다. */
  adminApiKey: undefined as string | undefined,
});
