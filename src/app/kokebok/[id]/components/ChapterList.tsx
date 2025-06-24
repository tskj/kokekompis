'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

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
}

export function ChapterList({ cookbookId, chapters }: ChapterListProps) {
  const pathname = usePathname();
  
  // Extract current recipe ID from pathname
  const currentRecipeId = pathname.includes(`/kokebok/${cookbookId}/`) 
    ? pathname.split(`/kokebok/${cookbookId}/`)[1] 
    : null;

  // Find which chapter contains the current recipe
  const activeChapterId = currentRecipeId 
    ? chapters.find(chapter => 
        chapter.recipes.some(recipe => recipe.id === currentRecipeId)
      )?.id
    : null;

  useEffect(() => {
    if (activeChapterId) {
      // Force open the chapter that contains the current recipe
      const detailsElement = document.querySelector(`details[data-chapter-id="${activeChapterId}"]`) as HTMLDetailsElement;
      if (detailsElement) {
        detailsElement.open = true;
      }
    }
  }, [activeChapterId, currentRecipeId]);

  return (
    <div className="space-y-2">
      {chapters.map((chapter) => (
        <details 
          key={chapter.id} 
          className="border rounded-lg"
          data-chapter-id={chapter.id}
          open={chapter.id === activeChapterId}
        >
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
                  <Link
                    key={recipe.id}
                    href={`/kokebok/${cookbookId}/${recipe.id}`}
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