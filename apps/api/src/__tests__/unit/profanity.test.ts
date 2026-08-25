import { describe, expect, it } from "vitest";

import { containsProfanity } from "../../lib/profanity";

describe("containsProfanity", () => {
  it("AC1: 비속어가 없는 정상적인 문장이면 false", () => {
    expect(containsProfanity("친절하고 설명이 자세했어요")).toBe(false);
  });

  it("AC2: 금칙어가 포함된 문장이면 true", () => {
    expect(containsProfanity("이 사무소 진짜 씨발 별로였어요")).toBe(true);
  });

  it("AC3: 금칙어 사이에 공백을 끼워 넣어도 정규화 후 검출된다", () => {
    expect(containsProfanity("이 사무소 진짜 씨 발 별로였어요")).toBe(true);
  });

  it("AC4: 영문 금칙어는 대소문자를 바꿔도 검출된다", () => {
    expect(containsProfanity("this office is FUCK terrible")).toBe(true);
  });
});
