DROP TABLE "user_open_chapters" CASCADE;--> statement-breakpoint
ALTER TABLE "cookbook" ADD COLUMN "beskrivelse" text;--> statement-breakpoint
ALTER TABLE "cookbook" ADD COLUMN "skisse" text;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "arkivert" timestamp with time zone;