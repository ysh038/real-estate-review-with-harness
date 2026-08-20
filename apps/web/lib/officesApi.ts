import {
  officesByBboxResponseSchema,
  type TBbox,
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
