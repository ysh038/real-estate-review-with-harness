import baseConfig from "./packages/config/eslint.base.mjs";

export default [
    // create-harness: 하네스 생성 파일은 호스트 lint 대상이 아니다
    { ignores: ['.harness/**'] },...baseConfig];
