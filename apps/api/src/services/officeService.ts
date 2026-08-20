import type {
  TBbox,
  TOfficeDetailResponse,
  TOfficeSummary,
  TOfficesByBboxResponse,
} from "@repo/types";

/**
 * 줌 아웃 한 번에 수만 건이 나가는 것을 막는 상한.
 * 잘렸다는 사실을 응답으로 알려 UI가 "확대해서 보세요"를 띄울 수 있게 한다.
 */
export const MAX_OFFICES_PER_BBOX = 500;

export interface IOfficeRepository {
  findByBbox: (bbox: TBbox, limit: number) => Promise<TOfficeSummary[]>;
}

export const createOfficeService = (repository: IOfficeRepository) => ({
  findByBbox: async (bbox: TBbox): Promise<TOfficesByBboxResponse> => {
    // 상한보다 1건 더 요청해야 "더 있는데 잘렸다"를 구분할 수 있다.
    // 정확히 상한만 요청하면 딱 맞은 경우와 넘친 경우가 같아 보인다.
    const rows = await repository.findByBbox(bbox, MAX_OFFICES_PER_BBOX + 1);
    const isTruncated = rows.length > MAX_OFFICES_PER_BBOX;

    return {
      offices: isTruncated ? rows.slice(0, MAX_OFFICES_PER_BBOX) : rows,
      isTruncated,
    };
  },
});

export type TOfficeService = ReturnType<typeof createOfficeService>;

export interface IOfficeDetailRepository {
  findById: (id: string) => Promise<TOfficeSummary | null>;
  /** 숨겨지지 않은(hidden_at IS NULL) 리뷰의 평점만 — 숨김은 집계에서 빠진다 (AC5). */
  findVisibleRatingsByOfficeId: (officeId: string) => Promise<number[]>;
}

/** 평점 표시는 소수 한 자리면 충분하다. 그 이상은 정밀해 보일 뿐 의미가 없다. */
const roundToOneDecimal = (value: number): number => Math.round(value * 10) / 10;

export const createOfficeDetailService = (
  repository: IOfficeDetailRepository,
) => ({
  findDetailById: async (
    id: string,
  ): Promise<TOfficeDetailResponse | null> => {
    const office = await repository.findById(id);
    if (!office) return null;

    const ratings = await repository.findVisibleRatingsByOfficeId(id);
    const total = ratings.reduce((sum, rating) => sum + rating, 0);

    return {
      ...office,
      reviewCount: ratings.length,
      // 리뷰가 없으면 null — 0으로 두면 "최악 평점"과 구분되지 않는다.
      avgRating:
        ratings.length === 0 ? null : roundToOneDecimal(total / ratings.length),
    };
  },
});

export type TOfficeDetailService = ReturnType<typeof createOfficeDetailService>;
