import { randomUUID } from "node:crypto";

import type { IKakaoOAuthClient } from "../lib/kakaoOAuthClient";

export interface IAuthUser {
  id: string;
  nickname: string;
  profileImageUrl: string | null;
  /** ISO datetime — 마이페이지 프로필의 가입일 표시용 (mypage-shell-and-profile 명세). */
  createdAt: string;
}

export interface IUserRepository {
  /** kakaoId 로 upsert — 신규면 생성, 기존이면 닉네임·프로필 이미지를 최신화한다 (AC1). */
  upsertByKakaoId: (profile: {
    kakaoId: string;
    nickname: string;
    profileImageUrl: string | null;
  }) => Promise<IAuthUser>;
  findById: (userId: string) => Promise<IAuthUser | null>;
  /** 닉네임만 갱신하고 최신 사용자 정보를 반환한다 (mypage-shell-and-profile AC5·AC7). */
  updateNickname: (userId: string, nickname: string) => Promise<IAuthUser>;
  /**
   * 회원 탈퇴 — 계정을 하드 삭제한다. 작성한 리뷰는 DB의 `ON DELETE SET NULL`이
   * 알아서 익명화한다 (member-account-deletion-and-anonymization 명세).
   */
  delete: (userId: string) => Promise<void>;
}

export interface ISessionRow {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface ISessionRepository {
  create: (session: ISessionRow) => Promise<void>;
  findById: (id: string) => Promise<ISessionRow | null>;
  deleteById: (id: string) => Promise<void>;
}

export interface IAuthServiceDeps {
  oauthClient: IKakaoOAuthClient;
  userRepository: IUserRepository;
  sessionRepository: ISessionRepository;
}

/** state 파라미터가 발급 시 저장한 값과 다르면 던진다 — 토큰 교환을 시도하지 않는다 (AC3). */
export class OAuthStateMismatchError extends Error {
  constructor() {
    super("state 파라미터가 일치하지 않습니다");
    this.name = "OAuthStateMismatchError";
  }
}

// remember me 없음(범위 밖) — 고정 TTL. 만료되면 재로그인.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface IHandleCallbackParams {
  code: string;
  state: string;
  /** 로그인 시작 시 쿠키에 저장해둔 state. 없거나 다르면 CSRF 의심. */
  expectedState: string | undefined;
}

export const createAuthService = (deps: IAuthServiceDeps) => ({
  handleCallback: async (
    params: IHandleCallbackParams,
  ): Promise<{ sessionId: string; expiresAt: Date }> => {
    if (!params.expectedState || params.state !== params.expectedState) {
      throw new OAuthStateMismatchError();
    }

    // AC4: 토큰 교환·프로필 조회 실패는 그대로 던져 라우트에서 실패로 처리한다 —
    // 여기서 세션을 만들지 않는 것만 보장하면 된다.
    const accessToken = await deps.oauthClient.exchangeCodeForToken(params.code);
    const profile = await deps.oauthClient.fetchProfile(accessToken);
    const user = await deps.userRepository.upsertByKakaoId(profile);

    const session: ISessionRow = {
      id: randomUUID(),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    };
    await deps.sessionRepository.create(session);

    return { sessionId: session.id, expiresAt: session.expiresAt };
  },

  getUserBySessionId: async (sessionId: string): Promise<IAuthUser | null> => {
    const session = await deps.sessionRepository.findById(sessionId);
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;

    return deps.userRepository.findById(session.userId);
  },

  logout: async (sessionId: string): Promise<void> => {
    await deps.sessionRepository.deleteById(sessionId);
  },
});

export type TAuthService = ReturnType<typeof createAuthService>;
