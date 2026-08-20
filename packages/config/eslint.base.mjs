import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

import harnessRules from "../../eslint.harness.config.js";

export default [
  // 전역 ignore — files 키 없이 ignores 만 있는 항목은 이 배열의 모든 설정 블록
  // (아래 harnessRules, 각 워크스페이스 eslint.config.mjs 포함)에 적용된다.
  // 워크스페이스별 lint 스크립트가 `eslint app`처럼 좁은 디렉터리만 보다가
  // `eslint .`로 넓어지면(하네스 갭 — 좁은 glob이 새 폴더를 놓치는 문제, G1과 동종)
  // Next.js가 만드는 .next/types/**의 코드생성 파일까지 우리 명명 규칙·any 금지에
  // 걸린다. 이 항목이 없으면 각 블록에 개별 ignores를 반복해야 한다.
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/coverage/**"],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ]
    }
  },
  // 하네스 규칙(명명·any 금지·공개 API 경계·import 정렬)을 모든 워크스페이스에 강제한다.
  ...harnessRules
];
