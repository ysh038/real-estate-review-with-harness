import {
  createReviewRequestSchema,
  officeDetailResponseSchema,
  reviewListResponseSchema,
  reviewSchema,
  type TCreateReviewRequest,
  type TOfficeDetailResponse,
  type TReview,
  type TReviewListResponse,
} from "@repo/types";

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** 서버가 준 상태 코드를 그대로 들고 있어, 호출부가 409·429 등을 구분해 안내할 수 있게 한다. */
export class ReviewApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ReviewApiError";
    this.status = status;
  }
}

export const fetchOfficeDetail = async (
  officeId: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<TOfficeDetailResponse> => {
  const response = await fetch(`${baseUrl}/api/offices/${officeId}`);
  if (!response.ok) {
    throw new ReviewApiError(
      response.status,
      `사무소 정보 조회 실패 (status ${response.status})`,
    );
  }
  return officeDetailResponseSchema.parse(await response.json());
};

export interface IFetchReviewsOptions {
  cursor?: string;
}

export const fetchReviews = async (
  officeId: string,
  { cursor }: IFetchReviewsOptions = {},
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<TReviewListResponse> => {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const response = await fetch(
    `${baseUrl}/api/offices/${officeId}/reviews${query}`,
  );
  if (!response.ok) {
    throw new ReviewApiError(
      response.status,
      `리뷰 목록 조회 실패 (status ${response.status})`,
    );
  }
  return reviewListResponseSchema.parse(await response.json());
};

export const createReview = async (
  officeId: string,
  input: TCreateReviewRequest,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<TReview> => {
  const body = createReviewRequestSchema.parse(input);
  const response = await fetch(`${baseUrl}/api/offices/${officeId}/reviews`, {
    method: "POST",
    // 세션 쿠키가 다른 origin(api)으로 실리려면 credentials: 'include' 가 필수다
    // (authApi.ts fetchCurrentUser 와 같은 이유).
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `리뷰 작성 실패 (status ${response.status})`;
    throw new ReviewApiError(response.status, message);
  }
  return reviewSchema.parse(await response.json());
};
