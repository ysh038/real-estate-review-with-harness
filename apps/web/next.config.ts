import type { NextConfig } from "next";

// env는 bun --env-file=../../.env 로 dev/build/start 실행 시 주입된다.
// (apps/web/package.json 스크립트 참고)
const nextConfig: NextConfig = {
  typedRoutes: true,
};

export default nextConfig;
