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

export const createFakeUserRepository = (
  user: IAuthUser = { id: "u-1", nickname: "홍길동", profileImageUrl: null },
): IUserRepository => ({
  upsertByKakaoId: vi.fn(async () => user),
  findById: vi.fn(async (id: string) => (id === user.id ? user : null)),
});

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
