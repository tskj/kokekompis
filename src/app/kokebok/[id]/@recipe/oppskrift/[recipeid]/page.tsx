import { db } from '@/lib/db';
import { recipes, recipeChapters, chapters } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Recipe } from '@/app/kokebok/[id]/components/Recipe';
import { recipeContentSchema } from '@/lib/db/schema';
import { openChapter } from '@/app/kokebok/[id]/actions';

interface RecipePageProps {
  params: Promise<{ id: string; recipeid: string }>;
}

async function getRecipeWithChapter(recipeId: string, cookbookId: string) {
  // Subquery: chapters in this cookbook
  const chaptersInCookbook = db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.cookbookId, cookbookId));

  const [recipeData] = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      description: recipes.description,
      content: recipes.content,
      chapterId: recipeChapters.chapterId,
    })
    .from(recipes)
    .innerJoin(recipeChapters, eq(recipes.id, recipeChapters.recipeId))
    .where(and(
      eq(recipes.id, recipeId),
      inArray(recipeChapters.chapterId, chaptersInCookbook)
    ))
    .limit(1);

  return recipeData || null;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id: cookbookId, recipeid } = await params;

  const recipeData = await getRecipeWithChapter(recipeid, cookbookId);
  if (!recipeData) notFound();

  await openChapter(recipeData.chapterId);

  return (
    <Recipe
      title={recipeData.title}
      description={recipeData.description}
      content={recipeContentSchema.parse(recipeData.content)}
    />
  );
}
