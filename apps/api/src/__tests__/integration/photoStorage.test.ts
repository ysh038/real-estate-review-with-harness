import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  createPhotoStorage,
  FileTooLargeError,
  InvalidContentTypeError,
  MAX_PHOTO_FILE_BYTES,
} from "../../lib/photoStorage";
import { canConnectS3, TEST_S3_CONFIG } from "../helpers/testS3";

/**
 * 입력 검증(허용 타입·용량)은 S3Client를 만들기만 하고 실제 네트워크 호출 전에
 * 던지므로, 접속 가능 여부와 무관하게 항상 돈다 — MinIO가 없는 환경(CI 등)에서도
 * 이 부분은 게이트에 걸린다.
 */
describe("createPhotoStorage — 입력 검증 (real MinIO 불필요)", () => {
  const storage = createPhotoStorage(TEST_S3_CONFIG);

  it("AC8: 허용되지 않는 content-type이면 InvalidContentTypeError", async () => {
    await expect(
      storage.upload(Buffer.from("not an image"), "application/pdf"),
    ).rejects.toThrow(InvalidContentTypeError);
  });

  it("AC9: 5MB를 초과하면 FileTooLargeError", async () => {
    const oversized = Buffer.alloc(MAX_PHOTO_FILE_BYTES + 1);
    await expect(storage.upload(oversized, "image/jpeg")).rejects.toThrow(
      FileTooLargeError,
    );
  });

  it("S3_PUBLIC_URL 미설정이면 storageKey를 그대로 반환한다", () => {
    const noPublicUrl = createPhotoStorage({ ...TEST_S3_CONFIG, publicUrl: undefined });
    expect(noPublicUrl.getPublicUrl("uploads/abc.jpg")).toBe("uploads/abc.jpg");
  });

  it("S3_PUBLIC_URL이 설정돼 있으면 그 뒤에 storageKey를 붙인다(끝 슬래시 정리)", () => {
    const withPublicUrl = createPhotoStorage({
      ...TEST_S3_CONFIG,
      publicUrl: "http://localhost:9002/reviews/",
    });
    expect(withPublicUrl.getPublicUrl("uploads/abc.jpg")).toBe(
      "http://localhost:9002/reviews/uploads/abc.jpg",
    );
  });
});

const isS3Reachable = await canConnectS3();

describe.skipIf(!isS3Reachable)("createPhotoStorage — 실 MinIO 업로드", () => {
  const storage = createPhotoStorage(TEST_S3_CONFIG);

  it("AC10: 정상 업로드하면 storageKey를 반환하고 공개 URL로 실제로 접근할 수 있다", async () => {
    const buffer = await sharp({
      create: { width: 500, height: 500, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    const { storageKey } = await storage.upload(buffer, "image/jpeg");
    expect(storageKey).toMatch(/^uploads\/.+\.jpg$/);

    const url = storage.getPublicUrl(storageKey);
    const response = await fetch(url);
    expect(response.status).toBe(200);
  });

  it("AC10: 2000px를 넘는 이미지는 긴 변 기준 2000px로 축소된다", async () => {
    const buffer = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    const { storageKey } = await storage.upload(buffer, "image/jpeg");
    const response = await fetch(storage.getPublicUrl(storageKey));
    const downloaded = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(downloaded).metadata();

    expect(metadata.width).toBe(2000);
    expect(metadata.height).toBe(1000);
  });

  it("AC10: 2000px보다 작은 이미지는 확대하지 않는다", async () => {
    const buffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .png()
      .toBuffer();

    const { storageKey } = await storage.upload(buffer, "image/png");
    const response = await fetch(storage.getPublicUrl(storageKey));
    const downloaded = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(downloaded).metadata();

    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });

  it("AC10: gif는 png로 변환되고 storageKey 확장자도 .png다", async () => {
    const buffer = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 255, b: 0 } },
    })
      .gif()
      .toBuffer();

    const { storageKey } = await storage.upload(buffer, "image/gif");
    expect(storageKey).toMatch(/\.png$/);

    const response = await fetch(storage.getPublicUrl(storageKey));
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
