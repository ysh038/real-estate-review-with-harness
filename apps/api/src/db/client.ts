import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * postgres.js 는 지연 연결이다 — 이 함수를 불러도 첫 질의 전까지 소켓을 열지 않는다.
 * 덕분에 DB가 없는 환경에서도 앱 조립까지는 문제없이 진행된다.
 */
export const createDb = (databaseUrl: string) =>
  drizzle(postgres(databaseUrl), { schema });

export type TDatabase = ReturnType<typeof createDb>;
