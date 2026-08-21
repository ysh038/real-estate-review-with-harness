import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
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

/**
 * 서비스 사용자. 카카오 OAuth로만 생성된다 (덩이 B).
 * 지금은 리뷰 표시에 실제로 필요한 최소 필드만 둔다 — 토큰 저장 등은 OAuth 붙일 때 판단한다.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** 카카오 회원번호. OAuth 콜백에서 이 값으로 기존 사용자를 찾거나 새로 만든다. */
  kakaoId: text("kakao_id").notNull().unique(),
  nickname: text("nickname").notNull(),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TUserRow = typeof users.$inferSelect;
export type TUserInsert = typeof users.$inferInsert;

/**
 * 사무소 리뷰. 사무소당 1인 1건.
 *
 * 1인 1리뷰·평점 범위·본문 길이를 DB 제약으로도 거는 이유는 경합이다 — 앱 검사에만 맡기면
 * 동시 요청 두 건이 둘 다 "아직 없음"을 확인하고 둘 다 쓴다
 * (근거: docs/specs/reviews-schema-and-read-api.md 설계 메모).
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    officeId: text("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    content: text("content").notNull(),
    /** 신고 누적으로 숨겨진 시각. NULL이면 노출된다 (soft hide). */
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    /** rate limit(IP+사무소 조합 24시간 1건) 판정용. review-write-and-report 명세 AC7. */
    createdFromIp: text("created_from_ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("reviews_office_user_unique").on(table.officeId, table.userId),
    // 목록 조회 + 커서 페이지네이션의 정렬 키와 같은 순서로 잡는다.
    index("reviews_office_created_idx").on(
      table.officeId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    check("reviews_rating_range", sql`${table.rating} between 1 and 5`),
    check(
      "reviews_content_min_length",
      sql`char_length(${table.content}) >= 10`,
    ),
  ],
);

export type TReviewRow = typeof reviews.$inferSelect;
export type TReviewInsert = typeof reviews.$inferInsert;

/**
 * 리뷰 신고. 한 사람이 같은 리뷰를 여러 번 신고할 수 없다 —
 * 그렇지 않으면 혼자서 누적 임계치를 채워 남의 리뷰를 숨길 수 있다.
 */
export const reviewReports = pgTable(
  "review_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    reporterUserId: uuid("reporter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("review_reports_review_reporter_unique").on(
      table.reviewId,
      table.reporterUserId,
    ),
  ],
);

export type TReviewReportRow = typeof reviewReports.$inferSelect;
export type TReviewReportInsert = typeof reviewReports.$inferInsert;

/**
 * 로그인 세션. 쿠키엔 이 행의 `id`(불투명 랜덤 토큰)만 담는다.
 *
 * 서명된 stateless 값 대신 DB 세션 테이블을 쓴 이유: 로그아웃이 즉시 무효화돼야 하고,
 * SESSION_SECRET 같은 새 시크릿을 만들지 않아도 된다 (근거: docs/specs/kakao-oauth-login.md
 * 열린 질문 #2).
 */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TSessionRow = typeof sessions.$inferSelect;
export type TSessionInsert = typeof sessions.$inferInsert;
