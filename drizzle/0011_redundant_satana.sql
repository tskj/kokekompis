ALTER TABLE "cookbook" ADD COLUMN "rekkefølge" integer;--> statement-breakpoint
ALTER TABLE "cookbook" ADD COLUMN "sistApnet" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plan_recipes" ADD COLUMN "ganger" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "hylleSortering" text DEFAULT 'egen' NOT NULL;