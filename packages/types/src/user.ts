import { z } from "zod";

const NICKNAME_MAX_LENGTH = 20;

/**
 * 세션이 있는 사용자 본인에게만 보이는 정보. `reviewAuthorSchema`(다른 사람에게도
 * 보이는 공개 필드)와 다르게 `createdAt`(가입일)을 포함한다 — 마이페이지 프로필 전용
 * (mypage-shell-and-profile 명세).
 */
export const authUserSchema = z.object({
  // 실제 DB 값은 uuid지만, 여기서 .uuid()를 강제하지 않는다 — 세션 식별자를 다루는
  // 기존 테스트 픽스처들이 "u-1"류의 짧은 문자열 관례를 이미 널리 쓰고 있어서다.
  id: z.string(),
  nickname: z.string(),
  profileImageUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type TAuthUser = z.infer<typeof authUserSchema>;

/** 빈 문자열(허들 없는 즉시 제출)과 과도하게 긴 값을 막는다. 중복 검사는 하지 않는다 — 표시용 값일 뿐 식별자가 아니다. */
export const updateNicknameRequestSchema = z.object({
  nickname: z.string().min(1).max(NICKNAME_MAX_LENGTH),
});

export type TUpdateNicknameRequest = z.infer<typeof updateNicknameRequestSchema>;
