import { db } from '@/lib/db';
import { cookbook, chapters, recipes, recipeChapters } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Recipe } from './components/Recipe';
import { recipeContentSchema } from '@/lib/db/schema';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ oppskrift?: string }>;
}

async function getCookbook(id: string) {
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

  // Get all recipe-chapter relationships for this cookbook with full recipe data
  const recipeChapterData = await db
    .select({
      chapterId: recipeChapters.chapterId,
      recipeId: recipeChapters.recipeId,
      order: recipeChapters.order,
      recipeTitle: recipes.title,
      recipeDescription: recipes.description,
      recipeContent: recipes.content,
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
        content: rc.recipeContent,
        order: rc.order,
      })),
  }));

  return {
    ...cookbookData,
    chapters: chaptersWithRecipes,
  };
}

export default async function CookbookPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { oppskrift: selectedRecipeId } = await searchParams;
  
  const cookbookData = await getCookbook(id);

  if (!cookbookData) {
    notFound();
  }

  // Find the selected recipe
  const selectedRecipe = selectedRecipeId
    ? cookbookData.chapters
        .flatMap(c => c.recipes)
        .find(r => r.id === selectedRecipeId)
    : null;

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
              <div className="space-y-2">
                {cookbookData.chapters.map((chapter) => (
                  <details key={chapter.id} className="border rounded-lg">
                    <summary className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-50">
                      {chapter.name}
                    </summary>
                    
                    <div className="border-t">
                      {chapter.recipes.length === 0 ? (
                        <p className="px-4 py-2 text-sm text-gray-500">
                          Ingen oppskrifter
                        </p>
                      ) : (
                        <div className="py-2">
                          {chapter.recipes.map((recipe) => (
                            <a
                              key={recipe.id}
                              href={`/kokebok/${id}?oppskrift=${recipe.id}`}
                              className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                                selectedRecipeId === recipe.id
                                  ? 'bg-blue-100 border-l-2 border-blue-500'
                                  : ''
                              }`}
                            >
                              <div className="font-medium">{recipe.title}</div>
                              {recipe.description && (
                                <div className="text-gray-500 text-xs mt-1 truncate">
                                  {recipe.description}
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recipe content - RIGHT side */}
        <div className="lg:col-span-3">
          {selectedRecipe ? (
            <Recipe
              title={selectedRecipe.title}
              description={selectedRecipe.description}
              content={recipeContentSchema.parse(selectedRecipe.content)}
            />
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <p className="text-xl mb-2">Velg en oppskrift fra listen til venstre</p>
                <p>Klikk på et kapittel for å se oppskriftene</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}