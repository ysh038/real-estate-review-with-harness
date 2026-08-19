import { z } from "zod";

/** 지도 화면 영역. GeoJSON/OGC 관례를 따라 minLng,minLat,maxLng,maxLat 순서. */
export const bboxSchema = z
  .object({
    minLng: z.number().min(-180).max(180),
    minLat: z.number().min(-90).max(90),
    maxLng: z.number().min(-180).max(180),
    maxLat: z.number().min(-90).max(90),
  })
  .refine((box) => box.minLng <= box.maxLng, {
    message: "minLng 는 maxLng 보다 클 수 없습니다",
    path: ["minLng"],
  })
  .refine((box) => box.minLat <= box.maxLat, {
    message: "minLat 는 maxLat 보다 클 수 없습니다",
    path: ["minLat"],
  });

export type TBbox = z.infer<typeof bboxSchema>;

/**
 * 쿼리스트링 `?bbox=minLng,minLat,maxLng,maxLat` 파서.
 * 라우트가 직접 split 하지 않도록 계약 쪽에 둔다 — 형식이 바뀌면 여기 한 곳만 고친다.
 */
export const bboxQuerySchema = z.object({
  bbox: z
    .string({ required_error: "bbox 파라미터가 필요합니다" })
    .transform((raw, ctx) => {
      const parts = raw.split(",");
      if (parts.length !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "bbox 는 minLng,minLat,maxLng,maxLat 4개 값이어야 합니다",
        });
        return z.NEVER;
      }
      const numbers = parts.map((part) => Number(part.trim()));
      if (numbers.some((value) => !Number.isFinite(value))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "bbox 의 각 값은 숫자여야 합니다",
        });
        return z.NEVER;
      }
      const [minLng, minLat, maxLng, maxLat] = numbers as [
        number,
        number,
        number,
        number,
      ];
      return { minLng, minLat, maxLng, maxLat };
    })
    .pipe(bboxSchema),
});

export const officeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerName: z.string().nullable(),
  address: z.string(),
  phone: z.string().nullable(),
  sigungu: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export type TOfficeSummary = z.infer<typeof officeSummarySchema>;

export const officesByBboxResponseSchema = z.object({
  offices: z.array(officeSummarySchema),
  /** 상한에 걸려 잘렸는가. UI가 "확대해서 보세요"를 띄우는 근거. */
  isTruncated: z.boolean(),
});

export type TOfficesByBboxResponse = z.infer<
  typeof officesByBboxResponseSchema
>;
