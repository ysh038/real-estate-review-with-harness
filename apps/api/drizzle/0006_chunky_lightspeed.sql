CREATE TABLE "review_helpful_votes" (
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "review_helpful_votes_review_id_user_id_pk" PRIMARY KEY("review_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;