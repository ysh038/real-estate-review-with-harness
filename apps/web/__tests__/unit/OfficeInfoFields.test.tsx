import type { TOfficeSummary } from "@repo/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OfficeInfoFields } from "../../components/OfficeInfoFields";

const OFFICE: TOfficeSummary = {
  id: "office-1",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
  tagCounts: [],
};

describe("OfficeInfoFields", () => {
  it("AC5: 대표자명·주소·전화번호가 보인다 (사무소명은 사용처가 직접 그린다)", () => {
    render(<OfficeInfoFields office={OFFICE} />);

    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("경기도 성남시 분당구 판교로 1")).toBeInTheDocument();
    expect(screen.getByText("031-000-0000")).toBeInTheDocument();
  });

  it("AC6: ownerName·phone 이 null 이면 '정보 없음'이 보인다", () => {
    render(
      <OfficeInfoFields office={{ ...OFFICE, ownerName: null, phone: null }} />,
    );

    expect(screen.getAllByText("정보 없음")).toHaveLength(2);
  });
});
