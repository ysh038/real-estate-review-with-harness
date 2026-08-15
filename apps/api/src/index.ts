import { loadServerEnv } from "@repo/env";

import { createApp } from "./app";

const env = loadServerEnv();
const app = createApp();

console.log(`[api] listening on :${env.API_PORT}`);

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
