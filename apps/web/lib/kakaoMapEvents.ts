/** window.kakao.maps.event 를 얇게 감싼다 — 훅 테스트에서 실제 SDK 없이 모킹하기 위함. */
export const addMapListener = (
  target: object,
  type: string,
  handler: () => void,
): void => {
  window.kakao.maps.event.addListener(target, type, handler);
};

export const removeMapListener = (
  target: object,
  type: string,
  handler: () => void,
): void => {
  window.kakao.maps.event.removeListener(target, type, handler);
};
