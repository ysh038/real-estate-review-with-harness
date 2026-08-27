// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextPlugin from "@next/eslint-plugin-next";

import baseConfig from "../../packages/config/eslint.base.mjs";

export default [
  // ds-init(design-system 스킬): projectService(타입 인식 린트)가 .storybook/의
  // 설정 파일들을 tsconfig.json의 프로그램 안에서 못 찾아 파싱 에러를 낸다 —
  // 설정 파일이라 타입 인식 린트가 애초에 필요 없으니 아예 뺀다.
  { ignores: [".storybook/**"] },
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  ...storybook.configs["flat/recommended"],
];
