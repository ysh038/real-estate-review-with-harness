import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OssPage from "../../../app/legal/oss/page";

describe("OssPage", () => {
  it("AC8: 이 저장소가 실제 쓰는 오픈소스 패키지와 라이선스가 정확히 보인다", () => {
    render(<OssPage />);

    expect(
      screen.getByRole("heading", { name: "오픈소스 라이선스 고지" }),
    ).toBeInTheDocument();

    // package.json에서 직접 확인한 실제 라이선스 — 원본 목록을 복사하지 않는다
    // (원본은 @aws-sdk/client-s3·sharp·postgres·@hono/zod-validator를 안 쓴다).
    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Hono")).toBeInTheDocument();
    expect(screen.getByText("Drizzle ORM")).toBeInTheDocument();
    expect(screen.getAllByText("Apache-2.0").length).toBe(3);
    expect(screen.getByText("Zod")).toBeInTheDocument();
    expect(screen.getByText("postgres")).toBeInTheDocument();
    expect(screen.getByText("Unlicense")).toBeInTheDocument();
    expect(screen.getByText("sharp")).toBeInTheDocument();
    expect(screen.getByText("@aws-sdk/client-s3")).toBeInTheDocument();
    expect(screen.getByText(/카카오 지도/)).toBeInTheDocument();
  });
});
