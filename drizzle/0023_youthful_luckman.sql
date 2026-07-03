CREATE TABLE "recipe_kategorier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipeId" uuid NOT NULL,
	"userId" text NOT NULL,
	"navn" text NOT NULL,
	CONSTRAINT "recipe_kategorier_recipeId_navn_unique" UNIQUE("recipeId","navn")
);
--> statement-breakpoint
ALTER TABLE "recipe_kategorier" ADD CONSTRAINT "recipe_kategorier_recipeId_recipes_id_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_kategorier" ADD CONSTRAINT "recipe_kategorier_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;