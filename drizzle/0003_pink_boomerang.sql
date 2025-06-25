CREATE TABLE "user_open_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"chapterId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_open_chapters_userId_chapterId_unique" UNIQUE("userId","chapterId")
);
--> statement-breakpoint
ALTER TABLE "user_open_chapters" ADD CONSTRAINT "user_open_chapters_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_open_chapters" ADD CONSTRAINT "user_open_chapters_chapterId_chapters_id_fk" FOREIGN KEY ("chapterId") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;