import { loadServerEnv } from "@repo/env";

import { createApp } from "./app";
import { createDb } from "./db/client";
import { createKakaoOAuthClient } from "./lib/kakaoOAuthClient";
import { createOfficeRepository } from "./repositories/officeRepository";
import { createReviewRepository } from "./repositories/reviewRepository";
import { createSessionRepository } from "./repositories/sessionRepository";
import { createUserRepository } from "./repositories/userRepository";

const env = loadServerEnv();
const db = createDb(env.DATABASE_URL);
const app = createApp({
  officeRepository: createOfficeRepository(db),
  reviewRepository: createReviewRepository(db),
  oauthClient: createKakaoOAuthClient({
    clientId: env.KAKAO_OAUTH_CLIENT_ID,
    clientSecret: env.KAKAO_OAUTH_CLIENT_SECRET,
    redirectUri: env.KAKAO_OAUTH_REDIRECT_URI,
  }),
  userRepository: createUserRepository(db),
  sessionRepository: createSessionRepository(db),
  webBaseUrl: env.WEB_BASE_URL,
  isProduction: env.NODE_ENV === "production",
});

console.log(`[api] listening on :${env.API_PORT}`);

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
