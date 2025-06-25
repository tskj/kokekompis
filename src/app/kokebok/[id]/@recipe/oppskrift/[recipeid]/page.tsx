import { db } from '@/lib/db';
import { recipes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Recipe } from '../../../components/Recipe';
import { recipeContentSchema } from '@/lib/db/schema';

interface RecipePageProps {
  params: Promise<{ id: string; recipeid: string }>;
}

async function getRecipe(recipeId: string) {
  const [recipeData] = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  return recipeData || null;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { recipeid } = await params;
  const recipeData = await getRecipe(recipeid);

  if (!recipeData) {
    notFound();
  }

  return (
    <Recipe
      title={recipeData.title}
      description={recipeData.description}
      content={recipeContentSchema.parse(recipeData.content)}
    />
  );
}