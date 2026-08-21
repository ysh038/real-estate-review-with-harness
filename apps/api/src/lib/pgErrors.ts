const UNIQUE_VIOLATION_CODE = "23505";

const hasUniqueViolationCode = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  "code" in value &&
  (value as { code: unknown }).code === UNIQUE_VIOLATION_CODE;

/**
 * Postgres unique_violation(23505). 경합 상황의 최후 방어선인 DB 제약 위반을 식별한다.
 *
 * drizzle-orm은 실제 postgres 에러를 그대로 던지지 않고 `DrizzleQueryError`로 감싸며,
 * 원본은 `.cause`에 담긴다 — 최상위 `code`만 보면 실제로 놓친다(review-write-and-report
 * 명세의 신고 중복 처리에서 500으로 실제로 겪은 버그). 한 단계는 풀어서 같이 본다.
 */
export const isUniqueViolation = (error: unknown): boolean =>
  hasUniqueViolationCode(error) ||
  hasUniqueViolationCode((error as { cause?: unknown } | null)?.cause);
