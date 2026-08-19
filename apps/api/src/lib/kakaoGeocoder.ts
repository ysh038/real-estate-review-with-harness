export interface IGeocodedPoint {
  lat: number;
  lng: number;
}

export interface IKakaoGeocoder {
  geocodeAddress: (address: string) => Promise<IGeocodedPoint | null>;
}

const ADDRESS_ENDPOINT = "https://dapi.kakao.com/v2/local/search/address.json";

interface IKakaoAddressResponse {
  documents: Array<{ x: string; y: string }>;
}

/**
 * 주소 검색 단순 매칭만 (명세 결정: 다중 후보·confidence 스코어링은 범위 밖).
 * 결과 없음/파싱 실패는 null — 호출부가 "지오코딩 실패"로 skip 처리한다.
 */
export const createKakaoGeocoder = (restApiKey: string): IKakaoGeocoder => ({
  geocodeAddress: async (address: string): Promise<IGeocodedPoint | null> => {
    if (!address.trim()) return null;

    const url = `${ADDRESS_ENDPOINT}?query=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${restApiKey}` },
    });
    if (!res.ok) return null;

    const body = (await res.json()) as IKakaoAddressResponse;
    const hit = body.documents?.[0];
    if (!hit) return null;

    const lng = Number(hit.x);
    const lat = Number(hit.y);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  },
});
