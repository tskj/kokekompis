'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toggleChapter } from '../actions';

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  order: number | null;
}

interface Chapter {
  id: string;
  name: string;
  order: number;
  recipes: Recipe[];
}

interface ChapterListProps {
  cookbookId: string;
  chapters: Chapter[];
  openChapterIds: string[];
  userId?: string;
}

export function ChapterList({ cookbookId, chapters, openChapterIds }: ChapterListProps) {
  const params = useParams();
  const currentRecipeId = params.recipeid as string | undefined;

  // Find which chapter contains the current recipe
  const activeChapterId = currentRecipeId 
    ? chapters.find(chapter => 
        chapter.recipes.some(recipe => recipe.id === currentRecipeId)
      )?.id
    : null;

  // Use server state for open chapters
  const openChapters = new Set([
    ...openChapterIds,
    ...(activeChapterId ? [activeChapterId] : [])
  ]);

  const handleDetailsToggle = async (chapterId: string, isOpen: boolean) => {
    try {
      await toggleChapter(cookbookId, chapterId, isOpen);
    } catch (error) {
      console.error('Failed to toggle chapter:', error);
    }
  };

  return (
    <div className="space-y-2">
      {chapters.map((chapter) => (
        <details 
          key={chapter.id} 
          className="border rounded-lg overflow-hidden"
          data-chapter-id={chapter.id}
          open={openChapters.has(chapter.id)}
          onToggle={(e) => handleDetailsToggle(chapter.id, e.currentTarget.open)}
        >
          <summary className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-50 transition-colors">
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
                  <Link
                    key={recipe.id}
                    href={`/kokebok/${cookbookId}/oppskrift/${recipe.id}`}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                      currentRecipeId === recipe.id
                        ? 'bg-blue-100 border-l-2 border-blue-500 font-medium'
                        : ''
                    }`}
                  >
                    <div className="font-medium">{recipe.title}</div>
                    {recipe.description && (
                      <div className="text-gray-500 text-xs mt-1 truncate">
                        {recipe.description}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}