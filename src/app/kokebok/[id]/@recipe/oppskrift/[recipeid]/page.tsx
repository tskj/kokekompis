import { db } from '@/lib/db';
import { recipes, recipeChapters } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Recipe } from '@/app/kokebok/[id]/components/Recipe';
import { recipeContentSchema } from '@/lib/db/schema';
import { auth } from '@/auth';
import { toggleChapter } from '@/app/kokebok/[id]/actions';

interface RecipePageProps {
  params: Promise<{ id: string; recipeid: string }>;
}

async function getRecipeWithChapter(recipeId: string) {
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
    .where(eq(recipes.id, recipeId))
    .limit(1);

  return recipeData || null;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id: cookbookId, recipeid } = await params;
  const recipeData = await getRecipeWithChapter(recipeid);

  if (!recipeData) {
    notFound();
  }

  // Auto-open the chapter for this recipe if user is authenticated
  const session = await auth();
  if (session?.user?.id && recipeData.chapterId) {
    try {
      await toggleChapter(cookbookId, recipeData.chapterId, true);
    } catch (error) {
      // Silently fail if toggle doesn't work
      console.error('Failed to auto-open chapter:', error);
    }
  }

  return (
    <Recipe
      title={recipeData.title}
      description={recipeData.description}
      content={recipeContentSchema.parse(recipeData.content)}
    />
  );
}