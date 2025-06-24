import { db } from '@/lib/db';
import { cookbook, chapters, recipes, recipeChapters } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ChapterList } from './components/ChapterList';

interface CookbookLayoutProps {
  recipe: React.ReactNode;
  params: Promise<{ id: string }>;
}

async function getCookbookWithChapters(id: string) {
  // Get cookbook info
  const [cookbookData] = await db
    .select({
      id: cookbook.id,
      name: cookbook.name,
      userId: cookbook.userId,
    })
    .from(cookbook)
    .where(eq(cookbook.id, id))
    .limit(1);

  if (!cookbookData) {
    return null;
  }

  // Get all chapters for this cookbook
  const chaptersData = await db
    .select()
    .from(chapters)
    .where(eq(chapters.cookbookId, id))
    .orderBy(asc(chapters.order));

  // Get all recipe-chapter relationships for this cookbook
  const recipeChapterData = await db
    .select({
      chapterId: recipeChapters.chapterId,
      recipeId: recipeChapters.recipeId,
      order: recipeChapters.order,
      recipeTitle: recipes.title,
      recipeDescription: recipes.description,
    })
    .from(recipeChapters)
    .innerJoin(chapters, eq(recipeChapters.chapterId, chapters.id))
    .innerJoin(recipes, eq(recipeChapters.recipeId, recipes.id))
    .where(eq(chapters.cookbookId, id))
    .orderBy(asc(recipeChapters.order));

  // Combine the data
  const chaptersWithRecipes = chaptersData.map((chapter) => ({
    ...chapter,
    recipes: recipeChapterData
      .filter((rc) => rc.chapterId === chapter.id)
      .map((rc) => ({
        id: rc.recipeId,
        title: rc.recipeTitle,
        description: rc.recipeDescription,
        order: rc.order,
      })),
  }));

  return {
    ...cookbookData,
    chapters: chaptersWithRecipes,
  };
}

export default async function CookbookLayout({ recipe, params }: CookbookLayoutProps) {
  const { id } = await params;
  const cookbookData = await getCookbookWithChapters(id);

  if (!cookbookData) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">{cookbookData.name}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Chapter sidebar - LEFT side */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Kapitler</h2>
            
            {cookbookData.chapters.length === 0 ? (
              <p className="text-gray-500">Ingen kapitler ennå</p>
            ) : (
              <ChapterList 
                cookbookId={id}
                chapters={cookbookData.chapters}
              />
            )}
          </div>
        </div>

        {/* Recipe content - RIGHT side */}
        <div className="lg:col-span-3">
          {recipe}
        </div>
      </div>
    </div>
  );
}