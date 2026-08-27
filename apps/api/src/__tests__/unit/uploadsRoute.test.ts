import { describe, expect, it, vi } from "vitest";

import { createApp } from "../../app";
import { FileTooLargeError, InvalidContentTypeError, type IPhotoStorage } from "../../lib/photoStorage";
import {
  createFakeAuthAppDeps,
  createFakeSessionRepository,
} from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const createFakePhotoStorage = (
  overrides: Partial<IPhotoStorage> = {},
): IPhotoStorage => ({
  upload: vi.fn(async () => ({ storageKey: "uploads/fake.jpg" })),
  getPublicUrl: vi.fn((storageKey: string) => `http://fake-storage/${storageKey}`),
  ...overrides,
});

const buildApp = (photoStorage: IPhotoStorage | undefined) => {
  const sessionRepository = createFakeSessionRepository();
  const app = createApp({
    ...createFakeAuthAppDeps(),
    sessionRepository,
    officeRepository: createFakeOfficeRepository(),
    reviewRepository: createFakeReviewRepository(),
    photoStorage,
  });
  return { app, sessionRepository };
};

const withSession = async (
  sessionRepository: ReturnType<typeof createFakeSessionRepository>,
) => {
  await sessionRepository.create({
    id: "sess-1",
    userId: "u-1",
    expiresAt: new Date(Date.now() + 60_000),
  });
  return { Cookie: "session_id=sess-1" };
};

const buildFormData = (file: File | null): FormData => {
  const form = new FormData();
  if (file) form.set("file", file);
  return form;
};

describe("POST /api/uploads", () => {
  it("AC6: 세션 쿠키 없이 요청하면 401", async () => {
    const { app } = buildApp(createFakePhotoStorage());

    const res = await app.request("/api/uploads", {
      method: "POST",
      body: buildFormData(new File(["x"], "a.jpg", { type: "image/jpeg" })),
    });

    expect(res.status).toBe(401);
  });

  it("AC7: 스토리지가 설정되지 않았으면 503", async () => {
    const { app, sessionRepository } = buildApp(undefined);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/uploads", {
      method: "POST",
      headers,
      body: buildFormData(new File(["x"], "a.jpg", { type: "image/jpeg" })),
    });

    expect(res.status).toBe(503);
  });

  it("AC8: file 필드가 없으면 400", async () => {
    const { app, sessionRepository } = buildApp(createFakePhotoStorage());
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/uploads", {
      method: "POST",
      headers,
      body: buildFormData(null),
    });

    expect(res.status).toBe(400);
  });

  it("AC8: 허용되지 않는 타입이면 400", async () => {
    const photoStorage = createFakePhotoStorage({
      upload: vi.fn(async () => {
        throw new InvalidContentTypeError();
      }),
    });
    const { app, sessionRepository } = buildApp(photoStorage);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/uploads", {
      method: "POST",
      headers,
      body: buildFormData(new File(["x"], "a.pdf", { type: "application/pdf" })),
    });

    expect(res.status).toBe(400);
  });

  it("AC9: 5MB를 초과하면 413", async () => {
    const photoStorage = createFakePhotoStorage({
      upload: vi.fn(async () => {
        throw new FileTooLargeError();
      }),
    });
    const { app, sessionRepository } = buildApp(photoStorage);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/uploads", {
      method: "POST",
      headers,
      body: buildFormData(new File(["x"], "a.jpg", { type: "image/jpeg" })),
    });

    expect(res.status).toBe(413);
  });

  it("AC10: 정상 업로드하면 200과 storageKey를 반환한다", async () => {
    const photoStorage = createFakePhotoStorage();
    const { app, sessionRepository } = buildApp(photoStorage);
    const headers = await withSession(sessionRepository);

    const res = await app.request("/api/uploads", {
      method: "POST",
      headers,
      body: buildFormData(new File(["x"], "a.jpg", { type: "image/jpeg" })),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ storageKey: "uploads/fake.jpg" });
    expect(photoStorage.upload).toHaveBeenCalledWith(expect.any(Buffer), "image/jpeg");
  });
});
