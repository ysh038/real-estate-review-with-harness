import { loadSeedEnv, loadServerEnv } from "@repo/env";

import { createDb } from "../db/client";
import { createGyeonggiClient } from "../lib/gyeonggiClient";
import { createKakaoGeocoder } from "../lib/kakaoGeocoder";
import { createOfficeRepository } from "../repositories/officeRepository";
import { createSeedService } from "../services/seedService";

// `bun run seed:sigungu -- 수원시` 형태로 시군명을 덮어쓸 수 있다 (AC7).
const argSigungu = process.argv[2];

const serverEnv = loadServerEnv();
const seedEnv = loadSeedEnv();
const sigungu = argSigungu ?? seedEnv.SEED_TARGET_SIGUNGU;

const db = createDb(serverEnv.DATABASE_URL);
const seedService = createSeedService({
  gyeonggiClient: createGyeonggiClient({
    apiKey: seedEnv.GYEONGGI_API_KEY,
    baseUrl: seedEnv.GYEONGGI_API_BASE_URL,
    path: seedEnv.GYEONGGI_API_PATH,
  }),
  kakaoGeocoder: createKakaoGeocoder(seedEnv.KAKAO_REST_API_KEY),
  officeRepository: createOfficeRepository(db),
});

console.log(`[seed] ${sigungu} 시딩 시작`);

try {
  const summary = await seedService.seedSigungu(sigungu);
  // AC8: 종료 시 요약 출력
  console.log(
    `[seed] 완료 — fetched=${summary.fetched} upserted=${summary.upserted} skipped=${summary.skipped}`,
  );
  process.exit(0);
} catch (error) {
  console.error("[seed] 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
}
