import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

import harnessRules from "../../eslint.harness.config.js";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**"],
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
