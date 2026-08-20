import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    /**
     * integration 테스트들이 같은 로컬 Postgres 하나를 공유한다. 파일을 병렬로 돌리면
     * 한 파일의 정리(delete)가 다른 파일이 방금 넣은 행을 지워 FK 위반·유령 실패가 난다
     * (실제로 reviews 명세 구현 중 겪었다). 공유 자원을 쓰는 이상 직렬이 정답이다.
     */
    fileParallelism: false,
  },
});
