import { loadServerEnv } from "@repo/env";

import { createApp } from "./app";
import { createDb } from "./db/client";
import { createOfficeRepository } from "./repositories/officeRepository";
import { createReviewRepository } from "./repositories/reviewRepository";

const env = loadServerEnv();
const db = createDb(env.DATABASE_URL);
const app = createApp({
  officeRepository: createOfficeRepository(db),
  reviewRepository: createReviewRepository(db),
});

console.log(`[api] listening on :${env.API_PORT}`);

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
