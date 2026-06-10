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
  order?: number | null;
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
      className="border-b border-line"
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer items-baseline justify-between gap-2 py-2.5 font-display text-lg hover:text-terra">
        {chapter.name}
        <span className="text-xs text-ink-soft">{isOpen ? '–' : '+'}</span>
      </summary>

      <div className="pb-3">
        {chapter.recipes.length === 0 ? (
          <p className="px-1 pb-1 text-sm italic text-ink-soft">Ingen oppskrifter ennå</p>
        ) : (
          <ul>
            {chapter.recipes.map((recipe) => (
              <li key={recipe.id}>
                <Link
                  href={uuidHref`/kokebok/${cookbookId}/oppskrift/${recipe.id}`}
                  className={`block border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors ${
                    currentRecipeId === recipe.id
                      ? 'border-terra font-medium text-terra'
                      : 'border-transparent text-ink hover:border-line hover:text-terra'
                  }`}
                >
                  {recipe.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

interface ChapterListProps {
  cookbookId: string;
  chapters: Chapter[];
  ukategorisert: Recipe[];
  openChapterIds: string[];
  userId?: string;
}

export function ChapterList({ cookbookId, chapters, ukategorisert, openChapterIds }: ChapterListProps) {
  const currentRecipeId = useRecipeId();

  return (
    <nav aria-label="Innhold" className="border-t border-line">
      {chapters.map((chapter) => (
        <Chapter
          key={chapter.id}
          chapter={chapter}
          cookbookId={cookbookId}
          initiallyOpen={openChapterIds.includes(chapter.id)}
          currentRecipeId={currentRecipeId}
        />
      ))}

      {ukategorisert.length > 0 && (
        <div className="border-b border-line pt-2.5">
          <h3 className="font-display text-lg italic text-ink-soft">Ukategorisert</h3>

          <ul className="pb-3 pt-1">
            {ukategorisert.map((recipe) => (
              <li key={recipe.id}>
                <Link
                  href={uuidHref`/kokebok/${cookbookId}/oppskrift/${recipe.id}`}
                  className={`block border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors ${
                    currentRecipeId === recipe.id
                      ? 'border-terra font-medium text-terra'
                      : 'border-transparent text-ink hover:border-line hover:text-terra'
                  }`}
                >
                  {recipe.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
