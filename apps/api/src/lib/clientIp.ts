import type { Context } from "hono";

/**
 * Bun 런타임 세부사항(fetch의 2번째 인자가 Server 인스턴스라는 것)을 여기 한 곳에 가둔다.
 * 나머지 코드(서비스·라우트)는 문자열 IP만 다룬다 — kakaoMapEvents.ts가 SDK를 가둔 것과
 * 같은 패턴 (근거: docs/specs/review-write-and-report.md 설계 메모).
 *
 * `hono/bun`의 getConnInfo를 쓰지 않는 이유: 그 배럴이 재export하는 ssg.js가 모듈
 * 로드 시점에 전역 `Bun`을 바로 참조해서, vitest(bunx로 실행해도 테스트 모듈은
 * Vite 러너를 거친다)에서 "Bun is not defined"로 죽는다. 우리가 실제로 쓰는 건
 * `c.env`가 Bun Server 인스턴스라는 사실 하나뿐이라 직접 구현한다.
 */
interface IBunServerLike {
  requestIP: (request: Request) => { address: string } | null;
}

const getBunServer = (c: Context): IBunServerLike | undefined => {
  const env = c.env as { server?: IBunServerLike } | IBunServerLike | undefined;
  if (!env) return undefined;
  if (typeof env === "object" && "server" in env && env.server) {
    return env.server;
  }
  return "requestIP" in env ? (env as IBunServerLike) : undefined;
};

export const getClientIp = (c: Context): string | null => {
  const server = getBunServer(c);
  if (!server || typeof server.requestIP !== "function") return null;

  const info = server.requestIP(c.req.raw);
  return info?.address ?? null;
};
