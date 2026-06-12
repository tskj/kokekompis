ALTER TABLE "recipe_marginalia" ALTER COLUMN "tekst" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_marginalia" ADD COLUMN "posX" real;--> statement-breakpoint
ALTER TABLE "recipe_marginalia" ADD COLUMN "posY" real;