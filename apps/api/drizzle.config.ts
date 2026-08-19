import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // generate 는 DB 접속 없이 동작한다. 접속 정보는 migrate 시점에만 필요하므로
  // 값이 없어도 설정 로드가 깨지지 않게 둔다 (키 없이 스키마 작업을 할 수 있어야 한다).
  dbCredentials: { url: databaseUrl ?? "" },
});
