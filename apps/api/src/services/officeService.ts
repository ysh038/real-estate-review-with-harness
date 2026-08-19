import type {
  TBbox,
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
