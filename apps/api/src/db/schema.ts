import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * 공인중개사 사무소.
 *
 * PK는 공공데이터의 등록번호를 그대로 쓴다 — 재시딩 upsert 멱등성이 공짜로 따라온다.
 * 좌표는 PostGIS 없이 double precision 두 컬럼. bbox는 단순 범위 질의라 공간 인덱스가
 * 필요할 만큼 복잡하지 않다 (근거: docs/specs/offices-schema-and-bbox-query.md).
 */
export const offices = pgTable(
  "offices",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** 원천 데이터에 대표자명이 빠진 건이 있다 */
    ownerName: text("owner_name"),
    address: text("address").notNull(),
    phone: text("phone"),
    /** 시딩 단위이자 지역 필터 키 */
    sigungu: text("sigungu").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("offices_lat_lng_idx").on(table.lat, table.lng),
    index("offices_sigungu_idx").on(table.sigungu),
  ],
);

export type TOfficeRow = typeof offices.$inferSelect;
export type TOfficeInsert = typeof offices.$inferInsert;
