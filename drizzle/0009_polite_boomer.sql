CREATE TABLE "plan_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planId" uuid NOT NULL,
	"recipeId" uuid NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "plan_recipes_planId_recipeId_unique" UNIQUE("planId","recipeId"),
	CONSTRAINT "plan_recipes_planId_order_unique" UNIQUE("planId","order"),
	CONSTRAINT "plan_order_starts_at_one" CHECK ("order" >= 1)
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"dato" date
);
--> statement-breakpoint
ALTER TABLE "plan_recipes" ADD CONSTRAINT "plan_recipes_planId_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_recipes" ADD CONSTRAINT "plan_recipes_recipeId_recipes_id_fk" FOREIGN KEY ("recipeId") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;