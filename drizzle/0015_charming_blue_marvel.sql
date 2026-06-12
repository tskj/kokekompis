CREATE TABLE "recipe_marginalia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipeId" uuid NOT NULL,
	"userId" text NOT NULL,
	"tekst" text NOT NULL,
	"krussedull" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "tekstFont" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "oppskriftFont" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_marginalia" ADD CONSTRAINT "recipe_marginalia_recipeId_recipes_id_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_marginalia" ADD CONSTRAINT "recipe_marginalia_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;