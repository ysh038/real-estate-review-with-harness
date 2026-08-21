import { describe, expect, it } from "vitest";

import { isUniqueViolation } from "../../lib/pgErrors";

describe("isUniqueViolation", () => {
  it("code가 23505면 true", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("실제로 겪은 형태 — drizzle이 감싸서 code가 error.cause에 있으면 true", () => {
    // drizzle-orm의 DrizzleQueryError는 원본 postgres 에러를 .cause에 담는다.
    // isUniqueViolation이 최상위 code만 보면 여기서 놓친다 — 실제로 review-write-and-report
    // 명세의 신고 중복(AC17) 스모크 테스트에서 500으로 드러난 버그다.
    const wrapped = new Error("Failed query");
    (wrapped as { cause?: unknown }).cause = { code: "23505" };

    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it("다른 에러 코드면 false", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
  });

  it("code가 아예 없으면 false", () => {
    expect(isUniqueViolation(new Error("무관한 에러"))).toBe(false);
  });

  it("null·undefined면 false", () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
