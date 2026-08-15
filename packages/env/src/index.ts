import { z } from "zod";

/**
 * 환경변수 스키마. 앱 시작 시점에 fail-fast 검증한다.
 * 새 변수는 반드시 여기와 .env.example 에 동시에 추가한다.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(8787),
  /** 카카오 REST 키 — 주소→좌표 지오코딩(시딩 전용) */
  KAKAO_REST_KEY: z.string().min(1),
});

const clientEnvSchema = z.object({
  /** 카카오 지도 JS SDK 키 — 브라우저 번들에 inline 된다 */
  NEXT_PUBLIC_KAKAO_JS_KEY: z.string().min(1),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

export type TServerEnv = z.infer<typeof serverEnvSchema>;
export type TClientEnv = z.infer<typeof clientEnvSchema>;

const format = (error: z.ZodError): string =>
  error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");

export const loadServerEnv = (source: NodeJS.ProcessEnv = process.env): TServerEnv => {
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`[env] 서버 환경변수 검증 실패\n${format(parsed.error)}`);
  }
  return parsed.data;
};

export const loadClientEnv = (source: Record<string, string | undefined>): TClientEnv => {
  const parsed = clientEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`[env] 클라이언트 환경변수 검증 실패\n${format(parsed.error)}`);
  }
  return parsed.data;
};
