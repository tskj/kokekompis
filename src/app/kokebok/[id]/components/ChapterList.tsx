'use client';

import { useState, useEffect } from 'react';
import { openChapter, closeChapter } from '@/app/kokebok/[id]/actions';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { useRecipeId } from '@/hooks/useUuidParams';
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

interface ChapterComponentProps {
  chapter: Chapter;
  cookbookId: string;
  initiallyOpen: boolean;
  currentRecipeId?: string;
}

function Chapter({ chapter, cookbookId, initiallyOpen, currentRecipeId }: ChapterComponentProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  const isActiveChapter = chapter.recipes.some(recipe => recipe.id === currentRecipeId);
  if (isActiveChapter && !isOpen) {
    setIsOpen(true);
  }

  useEffect(() => {
    if (isOpen) openChapter(chapter.id);
    else closeChapter(chapter.id);
  }, [isOpen, chapter.id]);

  return (
    <details
      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
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
                href={uuidHref`/kokebok/${cookbookId}/oppskrift/${recipe.id}`}
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
  );
}

interface ChapterListProps {
  cookbookId: string;
  chapters: Chapter[];
  openChapterIds: string[];
  userId?: string;
}

export function ChapterList({ cookbookId, chapters, openChapterIds }: ChapterListProps) {
  const currentRecipeId = useRecipeId();

  return (
    <div className="space-y-2">
      {chapters.map((chapter) => (
        <Chapter
          key={chapter.id}
          chapter={chapter}
          cookbookId={cookbookId}
          initiallyOpen={openChapterIds.includes(chapter.id)}
          currentRecipeId={currentRecipeId}
        />
      ))}
    </div>
  );
}
