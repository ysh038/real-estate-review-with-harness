import type { TOfficeDetailResponse } from "@repo/types";

import { fetchOfficeDetail } from "./reviewsApi";

/**
 * 홈 화면의 `/?office=<id>` 딥링크 파라미터를 사무소 상세로 바꾼다.
 * 존재하지 않거나 잘못된 id는 조용히 무시한다 — 딥링크가 깨졌다고 지도 전체가
 * 에러 화면이 되면 안 된다(office-detail-route-and-deeplink AC17).
 */
export const resolveInitialOffice = async (
  officeId: string | undefined,
): Promise<TOfficeDetailResponse | null> => {
  if (!officeId) return null;
  try {
    return await fetchOfficeDetail(officeId);
  } catch {
    return null;
  }
};
