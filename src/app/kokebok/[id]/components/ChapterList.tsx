'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toggleChapter } from '@/app/kokebok/[id]/actions';

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

  const openChapters = new Set(openChapterIds);

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
          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          data-chapter-id={chapter.id}
          open={openChapters.has(chapter.id)}
          onToggle={(e) => handleDetailsToggle(chapter.id, e.currentTarget.open)}
        >
          <summary className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {chapter.name}
          </summary>

          <div className="border-t border-gray-200 dark:border-gray-700">
            {chapter.recipes.length === 0 ? (
              <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                Ingen oppskrifter
              </p>
            ) : (
              <div className="py-2">
                {chapter.recipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/kokebok/${cookbookId}/oppskrift/${recipe.id}`}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${currentRecipeId === recipe.id
                      ? 'bg-blue-100 dark:bg-blue-900/50 border-l-2 border-blue-500 dark:border-blue-400 font-medium'
                      : ''
                      }`}
                  >
                    <div className="font-medium">{recipe.title}</div>
                    {recipe.description && (
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 truncate">
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
