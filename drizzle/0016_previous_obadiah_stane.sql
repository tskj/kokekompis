CREATE TABLE "cookbook_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cookbookId" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cookbook_shares_cookbookId_unique" UNIQUE("cookbookId")
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "tekstFont" SET DEFAULT 'montserrat';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "oppskriftFont" SET DEFAULT 'montserrat';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cookbook_shares" ADD CONSTRAINT "cookbook_shares_cookbookId_cookbook_id_fk" FOREIGN KEY ("cookbookId") REFERENCES "public"."cookbook"("id") ON DELETE cascade ON UPDATE no action;