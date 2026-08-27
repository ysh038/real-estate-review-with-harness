import { Hono } from "hono";

import { FileTooLargeError, InvalidContentTypeError, type IPhotoStorage } from "../lib/photoStorage";
import { requireAuth, type IAuthedVariables } from "../middleware/requireAuth";
import type { IAuthServiceDeps } from "../services/authService";

export interface IUploadsRouteDeps extends IAuthServiceDeps {
  /** 미설정이면(undefined) 라우트가 항상 503 — adminApiKey와 같은 패턴. */
  photoStorage: IPhotoStorage | undefined;
}

/** POST /api/uploads — 사진 업로드(EXIF 제거·리사이즈는 photoStorage가 처리). */
export const createUploadsRoute = (deps: IUploadsRouteDeps) =>
  new Hono<{ Variables: IAuthedVariables }>().post("/", requireAuth(deps), async (c) => {
    if (!deps.photoStorage) {
      return c.json({ message: "사진 업로드가 설정되지 않았습니다" }, 503);
    }

    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json({ message: "file 필드가 필요합니다" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const result = await deps.photoStorage.upload(buffer, file.type);
      return c.json(result);
    } catch (error) {
      if (error instanceof InvalidContentTypeError) {
        return c.json({ message: error.message }, 400);
      }
      if (error instanceof FileTooLargeError) {
        return c.json({ message: error.message }, 413);
      }
      throw error;
    }
  });
