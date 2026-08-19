CREATE TABLE "offices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_name" text,
	"address" text NOT NULL,
	"phone" text,
	"sigungu" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "offices_lat_lng_idx" ON "offices" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "offices_sigungu_idx" ON "offices" USING btree ("sigungu");