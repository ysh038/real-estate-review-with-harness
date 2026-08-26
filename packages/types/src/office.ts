import { z } from "zod";

import { tagCountSchema } from "./reviewTag";

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
  /**
   * bbox 목록은 상위 2개(TOP_TAGS_PER_OFFICE)로 제한, 상세는 전체 — 인터페이스는
   * 같은 스키마를 공유하고 개수 제한은 서비스 레이어에서 건다 (review-tags AC9/AC10).
   * 리뷰·태그가 없으면 빈 배열 — null 아님 (AC11).
   */
  tagCounts: z.array(tagCountSchema),
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

/** `GET /api/offices/search?q=` 쿼리. 빈 문자열은 "전체 검색"이 아니라 거부한다. */
export const officeSearchQuerySchema = z.object({
  q: z.string().min(1, "검색어를 입력해주세요"),
});

export type TOfficeSearchQuery = z.infer<typeof officeSearchQuerySchema>;

/**
 * 검색 결과는 `tagCounts`를 항상 빈 배열로 둔다 — 선택 후 열리는 상세 패널이
 * 태그를 렌더링하지 않아(`ReviewSection`이 별도로 다시 조회) 채울 실익이 없다
 * (근거: office-search-bar 설계 메모).
 */
export const officeSearchResponseSchema = z.object({
  offices: z.array(officeSummarySchema),
});

export type TOfficeSearchResponse = z.infer<typeof officeSearchResponseSchema>;
