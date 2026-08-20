export interface IGeocodedPoint {
  lat: number;
  lng: number;
}

export interface IGeocodeOfficeQuery {
  name: string;
  /** 원천 데이터가 주는 최선의 위치 정보. 이 문자열로 시작하는 결과만 채택한다. */
  legalDong: string;
}

export interface IKakaoGeocoder {
  geocodeOffice: (query: IGeocodeOfficeQuery) => Promise<IGeocodedPoint | null>;
}

const KEYWORD_ENDPOINT = "https://dapi.kakao.com/v2/local/search/keyword.json";

interface IKakaoKeywordDoc {
  x: string;
  y: string;
  address_name: string;
  road_address_name?: string;
}

interface IKakaoKeywordResponse {
  documents: IKakaoKeywordDoc[];
}

/**
 * 카카오 Local API는 시도명을 축약해 돌려준다 ("경기도" → "경기").
 * 이 명세는 경기도만 다루므로 그 하나만 정규화한다 (원본의 17개 시도 표는 YAGNI).
 */
const normalizeSido = (value: string): string => value.replace(/^경기도\s+/, "경기 ");

const matchesLegalDong = (docAddress: string | undefined, legalDong: string): boolean => {
  if (!docAddress) return false;
  return normalizeSido(docAddress).startsWith(normalizeSido(legalDong));
};

const toPoint = (doc: IKakaoKeywordDoc): IGeocodedPoint | null => {
  const lat = Number(doc.y);
  const lng = Number(doc.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

/**
 * 원천 데이터에 상세 주소가 없어(gyeonggiClient 참고) 주소 검색을 쓸 수 없다.
 * 대신 "법정동명 + 사무소명" 키워드 검색 결과 중 법정동명으로 시작하는 첫 건을 채택한다.
 * 일치하는 후보가 없으면 null — 오매칭(다른 구의 동명 사무소)보다 스킵이 낫다.
 */
export const createKakaoGeocoder = (restApiKey: string): IKakaoGeocoder => ({
  geocodeOffice: async ({ name, legalDong }): Promise<IGeocodedPoint | null> => {
    const query = `${legalDong} ${name}`.trim();
    if (!query) return null;

    const url = `${KEYWORD_ENDPOINT}?query=${encodeURIComponent(query)}&size=5`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${restApiKey}` },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as IKakaoKeywordResponse;
    const hit = (body.documents ?? []).find((doc) =>
      matchesLegalDong(doc.road_address_name ?? doc.address_name, legalDong),
    );
    if (!hit) return null;

    return toPoint(hit);
  },
});
