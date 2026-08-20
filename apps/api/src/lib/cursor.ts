/**
 * 커서 페이지네이션의 위치. 정렬 키 `(created_at DESC, id DESC)` 와 같은 조합이다.
 * `created_at` 만으로는 동시각 리뷰에서 순서가 불안정해 `id` 를 tie-breaker 로 함께 담는다.
 */
export interface ICursorPosition {
  createdAt: Date;
  id: string;
}

const SEPARATOR = "|";

/**
 * base64url 로 감싸 불투명하게 만든다 — 클라이언트가 내부 구조에 의존하기 시작하면
 * 정렬 키를 바꿀 수 없게 된다 (근거: docs/specs/reviews-schema-and-read-api.md).
 */
export const encodeCursor = (position: ICursorPosition): string =>
  Buffer.from(
    `${position.createdAt.toISOString()}${SEPARATOR}${position.id}`,
  ).toString("base64url");

/** 형식이 깨졌으면 null. 호출부가 400으로 바꾼다 — 조용히 첫 페이지로 넘어가지 않는다. */
export const decodeCursor = (cursor: string): ICursorPosition | null => {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, "base64url").toString("utf-8");
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(SEPARATOR);
  if (separatorIndex === -1) return null;

  const rawCreatedAt = decoded.slice(0, separatorIndex);
  const id = decoded.slice(separatorIndex + 1);
  if (!id) return null;

  const createdAt = new Date(rawCreatedAt);
  if (Number.isNaN(createdAt.getTime())) return null;

  return { createdAt, id };
};
