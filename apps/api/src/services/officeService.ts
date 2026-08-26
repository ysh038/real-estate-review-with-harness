import type {
  TBbox,
  TOfficeDetailResponse,
  TOfficeSearchResponse,
  TOfficeSummary,
  TOfficesByBboxResponse,
  TTagCount,
} from "@repo/types";

/**
 * 줌 아웃 한 번에 수만 건이 나가는 것을 막는 상한.
 * 잘렸다는 사실을 응답으로 알려 UI가 "확대해서 보세요"를 띄울 수 있게 한다.
 */
export const MAX_OFFICES_PER_BBOX = 500;

/** bbox 목록의 태그 집계는 상위 N개만 — 원본 상수(TOP_TAGS_PER_OFFICE)를 그대로 채택. */
export const TOP_TAGS_PER_OFFICE = 2;

/**
 * repository가 돌려주는 원시 사무소 행 — `tagCounts`는 뺀다. 태그 집계는 별도 배치
 * 조회로 얻어 서비스가 합성한다 (review-tags AC9/AC10 설계 메모).
 */
export type TOfficeSummaryRow = Omit<TOfficeSummary, "tagCounts">;

export interface IOfficeRepository {
  findByBbox: (bbox: TBbox, limit: number) => Promise<TOfficeSummaryRow[]>;
  /** 여러 사무소의 태그 집계를 한 번에 — N+1 방지. 사무소별 상위 topN개, 개수 내림차순. */
  findTopTagCountsByOfficeIds: (
    officeIds: string[],
    topN: number,
  ) => Promise<Map<string, TTagCount[]>>;
}

export const createOfficeService = (repository: IOfficeRepository) => ({
  findByBbox: async (bbox: TBbox): Promise<TOfficesByBboxResponse> => {
    // 상한보다 1건 더 요청해야 "더 있는데 잘렸다"를 구분할 수 있다.
    // 정확히 상한만 요청하면 딱 맞은 경우와 넘친 경우가 같아 보인다.
    const rows = await repository.findByBbox(bbox, MAX_OFFICES_PER_BBOX + 1);
    const isTruncated = rows.length > MAX_OFFICES_PER_BBOX;
    const page = isTruncated ? rows.slice(0, MAX_OFFICES_PER_BBOX) : rows;

    const tagCountsByOffice = await repository.findTopTagCountsByOfficeIds(
      page.map((row) => row.id),
      TOP_TAGS_PER_OFFICE,
    );

    return {
      offices: page.map((row) => ({
        ...row,
        tagCounts: tagCountsByOffice.get(row.id) ?? [],
      })),
      isTruncated,
    };
  },
});

export type TOfficeService = ReturnType<typeof createOfficeService>;

/** 검색 결과 드롭다운 하나에 다 담을 수 있는 정도로 좁게 — office-search-bar 명세. */
export const MAX_SEARCH_RESULTS = 8;

export interface IOfficeSearchRepository {
  /** 이름·주소 ILIKE + 비숨김 리뷰 수 내림차순. 개수 제한은 서비스가 건다. */
  searchByQuery: (query: string, limit: number) => Promise<TOfficeSummaryRow[]>;
}

export const createOfficeSearchService = (
  repository: IOfficeSearchRepository,
) => ({
  search: async (query: string): Promise<TOfficeSearchResponse> => {
    const rows = await repository.searchByQuery(query, MAX_SEARCH_RESULTS);
    return { offices: rows.map((row) => ({ ...row, tagCounts: [] })) };
  },
});

export type TOfficeSearchService = ReturnType<typeof createOfficeSearchService>;

export interface IOfficeDetailRepository {
  findById: (id: string) => Promise<TOfficeSummaryRow | null>;
  /** 숨겨지지 않은(hidden_at IS NULL) 리뷰의 평점만 — 숨김은 집계에서 빠진다 (AC5). */
  findVisibleRatingsByOfficeId: (officeId: string) => Promise<number[]>;
  /** 상세는 개수 제한 없이 전체 태그 집계 (bbox 목록과 달리 topN 없음, AC9). */
  findTagCountsByOfficeId: (officeId: string) => Promise<TTagCount[]>;
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

    const [ratings, tagCounts] = await Promise.all([
      repository.findVisibleRatingsByOfficeId(id),
      repository.findTagCountsByOfficeId(id),
    ]);
    const total = ratings.reduce((sum, rating) => sum + rating, 0);

    return {
      ...office,
      tagCounts,
      reviewCount: ratings.length,
      // 리뷰가 없으면 null — 0으로 두면 "최악 평점"과 구분되지 않는다.
      avgRating:
        ratings.length === 0 ? null : roundToOneDecimal(total / ratings.length),
    };
  },
});

export type TOfficeDetailService = ReturnType<typeof createOfficeDetailService>;
