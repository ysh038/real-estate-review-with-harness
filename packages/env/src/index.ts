import { z } from "zod";

/**
 * 환경변수 스키마. 앱 시작 시점에 fail-fast 검증한다.
 * 새 변수는 반드시 여기와 .env.example 에 동시에 추가한다.
 *
 * 스키마를 서버/시딩/클라이언트 셋으로 나눈 이유: API 서버가 시딩용 외부 API 키가
 * 없다는 이유로 부팅을 거부하면 안 된다. 필요한 곳에서만 필요한 것을 검증한다.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(8787),
});

/** 시딩 스크립트 전용. 런타임 서버는 이 값들을 읽지 않는다. */
const seedEnvSchema = z.object({
  /** 경기데이터드림 OpenAPI — 중개업소 원천 목록 */
  GYEONGGI_API_KEY: z.string().min(1),
  GYEONGGI_API_BASE_URL: z.string().url().default("https://openapi.gg.go.kr"),
  /** 카카오 REST 키 — 주소 → 좌표 지오코딩. 서버 밖으로 나가지 않는다 */
  KAKAO_REST_API_KEY: z.string().min(1),
  SEED_TARGET_SIGUNGU: z.string().min(1).default("성남시"),
});

const clientEnvSchema = z.object({
  /** 카카오 지도 JS SDK 키 — 브라우저 번들에 inline 되므로 도메인 제한이 필수 */
  NEXT_PUBLIC_KAKAO_JS_KEY: z.string().min(1),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

export type TServerEnv = z.infer<typeof serverEnvSchema>;
export type TSeedEnv = z.infer<typeof seedEnvSchema>;
export type TClientEnv = z.infer<typeof clientEnvSchema>;

const format = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

const parseOrThrow = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  source: Record<string, string | undefined>,
  label: string,
): z.infer<TSchema> => {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`[env] ${label} 환경변수 검증 실패\n${format(parsed.error)}`);
  }
  return parsed.data;
};

export const loadServerEnv = (
  source: Record<string, string | undefined> = process.env,
): TServerEnv => parseOrThrow(serverEnvSchema, source, "서버");

export const loadSeedEnv = (
  source: Record<string, string | undefined> = process.env,
): TSeedEnv => parseOrThrow(seedEnvSchema, source, "시딩");

export const loadClientEnv = (
  source: Record<string, string | undefined>,
): TClientEnv => parseOrThrow(clientEnvSchema, source, "클라이언트");
