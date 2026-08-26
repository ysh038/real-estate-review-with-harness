import {
  officeSearchResponseSchema,
  officesByBboxResponseSchema,
  type TBbox,
  type TOfficeSearchResponse,
  type TOfficesByBboxResponse,
} from "@repo/types";

const buildOfficesUrl = (baseUrl: string, bbox: TBbox): string => {
  const query = [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat].join(",");
  return `${baseUrl}/api/offices?bbox=${encodeURIComponent(query)}`;
};

export const fetchOfficesByBbox = async (
  bbox: TBbox,
  baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<TOfficesByBboxResponse> => {
  const response = await fetch(buildOfficesUrl(baseUrl, bbox));
  if (!response.ok) {
    throw new Error(`오피스 조회 실패 (status ${response.status})`);
  }
  const json: unknown = await response.json();
  return officesByBboxResponseSchema.parse(json);
};

export const searchOffices = async (
  query: string,
  baseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<TOfficeSearchResponse> => {
  const response = await fetch(
    `${baseUrl}/api/offices/search?q=${encodeURIComponent(query)}`,
  );
  if (!response.ok) {
    throw new Error(`사무소 검색 실패 (status ${response.status})`);
  }
  const json: unknown = await response.json();
  return officeSearchResponseSchema.parse(json);
};
