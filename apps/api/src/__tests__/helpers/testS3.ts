import type { IPhotoStorageConfig } from "../../lib/photoStorage";

/**
 * 통합 테스트 전용 MinIO 설정. Postgres(testDb.ts)와 달리 별도 "테스트용" 인스턴스가
 * 필요 없다 — 업로드마다 랜덤 storageKey로 새 오브젝트를 만들 뿐 기존 데이터를 지우거나
 * 덮어쓰지 않아 개발용 MinIO에 그대로 붙어도 안전하다.
 */
export const TEST_S3_CONFIG: IPhotoStorageConfig = {
  provider: "minio",
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  accessKey: process.env.S3_ACCESS_KEY ?? "",
  secretKey: process.env.S3_SECRET_KEY ?? "",
  bucket: process.env.S3_BUCKET ?? "reviews",
  publicUrl: process.env.S3_PUBLIC_URL,
};

export const canConnectS3 = async (): Promise<boolean> => {
  const endpoint = TEST_S3_CONFIG.endpoint;
  if (!endpoint) return false;
  try {
    await fetch(endpoint, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
};
