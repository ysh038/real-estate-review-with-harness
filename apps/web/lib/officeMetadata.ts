import type { TOfficeDetailResponse } from "@repo/types";

export interface IOfficeMetadata {
  title: string;
  description: string;
}

/** `/offices/[id]` 의 OG 메타데이터를 만든다 — 순수 함수라 서버/클라이언트 어디서도 재사용 가능. */
export const buildOfficeMetadata = (
  office: TOfficeDetailResponse,
): IOfficeMetadata => ({
  title: office.name,
  description:
    office.reviewCount > 0
      ? `${office.address} · 리뷰 ${office.reviewCount}개`
      : `${office.address} · 아직 리뷰가 없습니다`,
});
