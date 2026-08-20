import { defineConfig } from "vitest/config";

export default defineConfig({
  // .tsx 테스트(OfficeDetailPanel)를 파싱하려면 JSX 변환이 필요하다.
  // Next.js 15의 vite는 rolldown 기반이라 esbuild 가 아니라 oxc 옵션을 읽는다.
  // React 17+ automatic runtime이라 테스트에 별도 React import 가 필요 없다.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["__tests__/**/*.test.{ts,tsx}"],
    setupFiles: ["./__tests__/setup.ts"],
  },
});
