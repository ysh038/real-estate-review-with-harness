/**
 * 명백한 욕설을 걸러내는 간단한 필터. 완전한 콘텐츠 모더레이션이 목표가 아니다
 * (근거: docs/specs/review-profanity-filter.md 설계 메모). 목록·구현은 이 저장소에서
 * 새로 작성했다 — 원본의 정규화(공백 제거+소문자화) 방식만 인터페이스로 참고했다
 * (통제변인 원칙, docs/decisions.md #9).
 */
const PROFANITY_WORDS = [
  "씨발",
  "시발",
  "개새끼",
  "병신",
  "지랄",
  "좆",
  "미친놈",
  "미친년",
  "fuck",
  "shit",
  "bitch",
] as const;

const normalize = (text: string): string => text.replace(/\s+/g, "").toLowerCase();

export const containsProfanity = (text: string): boolean => {
  const normalized = normalize(text);
  return PROFANITY_WORDS.some((word) => normalized.includes(word));
};
