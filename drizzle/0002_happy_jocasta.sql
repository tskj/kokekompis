CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cookbookId" uuid NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "chapters_cookbookId_order_unique" UNIQUE("cookbookId","order"),
	CONSTRAINT "order_starts_at_one" CHECK ("order" >= 1)
);
--> statement-breakpoint
CREATE TABLE "cookbook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipeId" uuid NOT NULL,
	"chapterId" uuid NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "recipe_chapters_chapterId_order_unique" UNIQUE("chapterId","order"),
	CONSTRAINT "recipe_chapters_recipeId_chapterId_unique" UNIQUE("recipeId","chapterId"),
	CONSTRAINT "recipe_order_starts_at_one" CHECK ("order" >= 1)
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_cookbookId_cookbook_id_fk" FOREIGN KEY ("cookbookId") REFERENCES "public"."cookbook"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cookbook" ADD CONSTRAINT "cookbook_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_chapters" ADD CONSTRAINT "recipe_chapters_recipeId_recipes_id_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_chapters" ADD CONSTRAINT "recipe_chapters_chapterId_chapters_id_fk" FOREIGN KEY ("chapterId") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;