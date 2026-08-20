import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "../../lib/cursor";

const POSITION = {
  createdAt: new Date("2026-08-20T12:34:56.000Z"),
  id: "3f1a0c9e-1111-4222-8333-444455556666",
};

describe("cursor", () => {
  it("인코딩한 커서를 디코딩하면 같은 위치가 나온다", () => {
    const decoded = decodeCursor(encodeCursor(POSITION));

    expect(decoded).toEqual(POSITION);
  });

  it("커서는 내부 구조가 드러나지 않는 불투명 문자열이다", () => {
    const cursor = encodeCursor(POSITION);

    expect(cursor).not.toContain(POSITION.id);
    expect(cursor).not.toContain("2026-08-20");
  });

  it("AC12: 형식이 깨진 커서면 null 을 반환한다", () => {
    expect(decodeCursor("not-a-valid-cursor")).toBeNull();
  });

  it("AC12: base64 이지만 내용이 규격에 안 맞으면 null 을 반환한다", () => {
    expect(decodeCursor(Buffer.from("garbage").toString("base64url"))).toBeNull();
  });

  it("AC12: 날짜가 유효하지 않은 커서면 null 을 반환한다", () => {
    const broken = Buffer.from(`not-a-date|${POSITION.id}`).toString("base64url");

    expect(decodeCursor(broken)).toBeNull();
  });
});
