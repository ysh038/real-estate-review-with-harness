import { z } from "zod";

/**
 * 원본(real-estate-agent-review)에는 미리 정의된 6개 태그를 리뷰에 붙이는 기능이 있다
 * (근거: docs/decisions.md #9, docs/specs/review-tags.md). 값 자체는 사용자에게 보이는
 * 한국어 라벨이라 원본 문구를 그대로 채택했다 — dealType/dealResult 때와 같은 논리로
 * 도메인 어휘 취급, 통제변인(소스 미복사) 위반이 아니다.
 *
 * review.ts 가 아니라 이 파일에 두는 이유: review.ts 는 이미 officeSummarySchema 를 쓰려고
 * office.ts 를 import한다. office.ts 도 tagCountSchema 가 필요한데 review.ts 에 두면
 * office.ts → review.ts → office.ts 순환 참조가 생긴다. 태그 스키마를 제3의 파일로 빼면
 * 양쪽이 여기만 가져가 순환이 안 생긴다.
 */
export const REVIEW_TAGS = [
  "매물 많음",
  "응답 빠름",
  "허위매물 없음",
  "친절함",
  "강매 없음",
  "설명 꼼꼼",
] as const;

export const reviewTagEnum = z.enum(REVIEW_TAGS);
export type TReviewTag = z.infer<typeof reviewTagEnum>;

export const tagCountSchema = z.object({
  tag: reviewTagEnum,
  count: z.number().int().nonnegative(),
});

export type TTagCount = z.infer<typeof tagCountSchema>;
