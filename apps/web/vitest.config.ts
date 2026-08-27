import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// ds-init(design-system 스킬): .storybook/ 의 스토리 play 함수를 이 vitest 프로젝트가
// 그대로 재생해 검증한다. "unit"과 "storybook"을 별도 프로젝트로 나눠 하네스가
// 각각 다른 체크(test / test-storybook)로 독립 실행할 수 있게 한다 — 브라우저를
// 띄우는 storybook 프로젝트가 매번 평범한 유닛 테스트 실행에 끼어들지 않는다.
export default defineConfig({
  // .tsx 테스트(OfficeDetailPanel)를 파싱하려면 JSX 변환이 필요하다.
  // Next.js 15의 vite는 rolldown 기반이라 esbuild 가 아니라 oxc 옵션을 읽는다.
  // React 17+ automatic runtime이라 테스트에 별도 React import 가 필요 없다.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          globals: true,
          environment: "jsdom",
          include: ["__tests__/**/*.test.{ts,tsx}"],
          setupFiles: ["./__tests__/setup.ts"],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            // 기본 포트(63315)가 Windows/Hyper-V(WSL2)의 동적 포트 제외 범위
            // (`netsh interface ipv4 show excludedportrange protocol=tcp`로 확인,
            // 63274~63373 배제됨)에 걸려 IPv4·IPv6 둘 다 EACCES로 막혔다 —
            // 그 범위 밖의 고정 포트로 우회한다. Windows 재부팅으로 제외 범위가
            // 바뀌면 이 포트도 다시 막힐 수 있다 — 그때는 값을 바꾼다.
            api: { host: "127.0.0.1", port: 61245 },
          },
        },
      },
    ],
  },
});
