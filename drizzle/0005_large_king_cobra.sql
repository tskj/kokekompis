-- Oppskrifter får en eier-bok (cookbookId NOT NULL). Eksisterende rader er PoC-seed uten
-- bok-tilhørighet — de ryddes vekk her så kolonnen kan fødes NOT NULL (notater/delinger/lenker
-- kaskaderer). Kjør `pnpm db:seed` etterpå lokalt.
DELETE FROM "recipes";--> statement-breakpoint
CREATE TABLE "recipe_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fromRecipeId" uuid NOT NULL,
	"toRecipeId" uuid NOT NULL,
	CONSTRAINT "recipe_links_fromRecipeId_toRecipeId_unique" UNIQUE("fromRecipeId","toRecipeId"),
	CONSTRAINT "no_self_link" CHECK ("fromRecipeId" <> "toRecipeId")
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "cookbookId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_links" ADD CONSTRAINT "recipe_links_fromRecipeId_recipes_id_fk" FOREIGN KEY ("fromRecipeId") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_links" ADD CONSTRAINT "recipe_links_toRecipeId_recipes_id_fk" FOREIGN KEY ("toRecipeId") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_cookbookId_cookbook_id_fk" FOREIGN KEY ("cookbookId") REFERENCES "public"."cookbook"("id") ON DELETE cascade ON UPDATE no action;
