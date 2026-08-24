CREATE TABLE "review_tags" (
	"review_id" uuid NOT NULL,
	"tag_key" text NOT NULL,
	CONSTRAINT "review_tags_review_id_tag_key_pk" PRIMARY KEY("review_id","tag_key")
);
--> statement-breakpoint
ALTER TABLE "review_tags" ADD CONSTRAINT "review_tags_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_tags_tag_key_idx" ON "review_tags" USING btree ("tag_key");