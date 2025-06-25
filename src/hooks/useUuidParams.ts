'use client';

import { useParams } from 'next/navigation';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';
import { notFound } from 'next/navigation';

/**
 * Generic hook for validating any UUID parameter
 */
export function useUuidParam(paramName: string): string {
  const params = useParams();
  const param = params[paramName] as string | undefined;
  if (!param) notFound();

  const parsedId = parseUuidParam(param);
  if (!parsedId) notFound();

  return parsedId;
}

/**
 * Hook that extracts and validates the cookbook ID from URL params
 * Supports both UUID and Base32 encoded UUID formats
 */
export function useCookbookId(): string {
  return useUuidParam('id');
}

/**
 * Hook that extracts and validates the recipe ID from URL params
 * Supports both UUID and Base32 encoded UUID formats
 */
export function useRecipeId(): string | undefined {
  const params = useParams();
  const param = params.recipeid as string | undefined;
  if (!param) return undefined;

  const parsedId = parseUuidParam(param);
  return parsedId || undefined;
}

/**
 * Hook that extracts and validates the chapter ID from URL params
 * Supports both UUID and Base32 encoded UUID formats
 */
export function useChapterId(): string {
  return useUuidParam('chapterid');
}