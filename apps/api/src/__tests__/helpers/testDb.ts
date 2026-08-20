import postgres from "postgres";

/**
 * 통합 테스트 전용 DB만 가리킨다. `DATABASE_URL`(시딩 데이터가 든 개발 DB)을 재사용하지
 * 않는다 — 실제로 통합 테스트의 beforeEach/afterAll db.delete(...)가 시딩 데이터를
 * 지운 사고가 있었다 (docs/decisions.md #8). 변수명을 분리해두면 `DATABASE_URL=... vitest run`
 * 처럼 실수로 개발 DB를 겨눠도 통합 테스트가 그 값을 아예 보지 않아 자동으로 skip된다 —
 * "돌리지 마라"는 규칙이 아니라 구조로 막는다.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export const canConnect = async (url: string | undefined): Promise<boolean> => {
  if (!url) return false;
  const probe = postgres(url, { max: 1, connect_timeout: 2, onnotice: () => {} });
  try {
    await probe`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.end({ timeout: 1 });
  }
};
