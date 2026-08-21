/**
 * routes/auth.ts(발급)와 middleware/requireAuth.ts(검증)가 공유한다.
 * 상수 하나를 공유하려고 서로를 import하면 순환 참조가 되니 별도 파일에 둔다.
 */
export const SESSION_COOKIE_NAME = "session_id";
