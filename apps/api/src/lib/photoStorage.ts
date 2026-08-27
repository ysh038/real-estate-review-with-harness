import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

/** 리뷰당 사진 상한(REVIEW_PHOTOS_MAX)과는 별개 — 파일 하나의 용량 상한. */
export const MAX_PHOTO_FILE_BYTES = 5 * 1024 * 1024;

/** 리사이즈 긴 변 상한. 확대는 하지 않는다(fit: inside, withoutEnlargement). */
const MAX_DIMENSION = 2000;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const ALLOWED_PHOTO_CONTENT_TYPES = Object.keys(ALLOWED_TYPES);

export class InvalidContentTypeError extends Error {
  constructor() {
    super("지원하지 않는 파일 형식입니다. jpeg, png, webp, gif만 가능합니다");
    this.name = "InvalidContentTypeError";
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super("파일 용량이 너무 큽니다. 최대 5MB까지 가능합니다");
    this.name = "FileTooLargeError";
  }
}

export interface IPhotoStorage {
  /** EXIF 방향 보정 후 태그 제거, 최대 2000px 리사이즈까지 처리한 뒤 저장한다. */
  upload: (fileBuffer: Buffer, contentType: string) => Promise<{ storageKey: string }>;
  /** S3_PUBLIC_URL 미설정이면 storageKey를 그대로 반환한다(설계 메모). */
  getPublicUrl: (storageKey: string) => string;
}

/**
 * 순수 문자열 변환이라 S3 자격증명이 없어도(업로드 기능이 꺼져 있어도) 계산할 수 있다.
 * reviewService가 기존 리뷰의 사진 url을 만들 때 IPhotoStorage 전체가 아니라 이 함수와
 * publicUrl 문자열만 있으면 되는 이유 — 읽기 경로가 쓰기(업로드) 설정 여부에 얽매이지
 * 않게 하기 위해서다(review-photo-upload 설계 메모).
 */
export const resolvePhotoPublicUrl = (
  storageKey: string,
  publicUrl: string | undefined,
): string => {
  if (!publicUrl) return storageKey;
  return `${publicUrl.replace(/\/$/, "")}/${storageKey}`;
};

export interface IPhotoStorageConfig {
  provider: "minio" | "s3" | "r2";
  endpoint?: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl?: string;
}

/**
 * GIF는 애니메이션 프레임을 보존하지 않고 첫 프레임만 png로 재인코딩한다 —
 * sharp가 무손실로 다룰 수 있는 정지 이미지 포맷이 아니기 때문이다.
 */
const processImage = async (
  fileBuffer: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer; contentType: string; ext: string }> => {
  const isGif = contentType === "image/gif";
  const outputContentType = isGif ? "image/png" : contentType;
  const outputExt = isGif ? ".png" : ALLOWED_TYPES[contentType]!;

  const pipeline = sharp(fileBuffer)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true });

  let buffer: Buffer;
  if (outputContentType === "image/jpeg") {
    buffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
  } else if (outputContentType === "image/webp") {
    buffer = await pipeline.webp({ quality: 85 }).toBuffer();
  } else {
    buffer = await pipeline.png().toBuffer();
  }

  return { buffer, contentType: outputContentType, ext: outputExt };
};

/** MinIO 로컬 개발 전용 — S3/R2 버킷은 콘솔에서 미리 만들어둔다는 전제라 대상이 아니다. */
const ensureMinIOBucket = async (client: S3Client, bucket: string): Promise<void> => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        }),
      }),
    );
  }
};

export const createPhotoStorage = (config: IPhotoStorageConfig): IPhotoStorage => {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.provider === "r2" ? "auto" : config.region,
    forcePathStyle: config.provider !== "s3",
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
  });

  let isBucketReady = false;

  return {
    upload: async (fileBuffer, contentType) => {
      if (!ALLOWED_TYPES[contentType]) throw new InvalidContentTypeError();
      if (fileBuffer.byteLength > MAX_PHOTO_FILE_BYTES) throw new FileTooLargeError();

      const processed = await processImage(fileBuffer, contentType);

      if (!isBucketReady) {
        if (config.provider === "minio") await ensureMinIOBucket(client, config.bucket);
        isBucketReady = true;
      }

      const storageKey = `uploads/${randomUUID()}${processed.ext}`;
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: storageKey,
          Body: processed.buffer,
          ContentType: processed.contentType,
        }),
      );

      return { storageKey };
    },

    getPublicUrl: (storageKey) => resolvePhotoPublicUrl(storageKey, config.publicUrl),
  };
};

/**
 * env 값으로부터 스토리지를 조립한다. 자격증명이 없거나(minio/r2는 endpoint까지)
 * 필요한 값이 비어 있으면 undefined를 반환한다 — `adminApiKey`와 같은 패턴으로,
 * "기능이 꺼짐"을 라우트 레벨에서 그대로 503으로 이어지게 한다.
 */
export const createPhotoStorageFromEnv = (env: {
  STORAGE_PROVIDER: "minio" | "s3" | "r2";
  S3_ENDPOINT?: string;
  S3_REGION: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  S3_BUCKET: string;
  S3_PUBLIC_URL?: string;
}): IPhotoStorage | undefined => {
  if (!env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) return undefined;
  if (env.STORAGE_PROVIDER !== "s3" && !env.S3_ENDPOINT) return undefined;

  return createPhotoStorage({
    provider: env.STORAGE_PROVIDER,
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    bucket: env.S3_BUCKET,
    publicUrl: env.S3_PUBLIC_URL,
  });
};
