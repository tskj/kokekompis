import { parseUuidParam } from './uuid-base32';
import { notFound } from 'next/navigation';

/**
 * Generic function for validating any UUID parameter in server components
 */
export function getUuidParam(params: Record<string, string | undefined>, paramName: string): string {
  const param = params[paramName];
  if (!param) notFound();

  const parsedId = parseUuidParam(param);
  if (!parsedId) notFound();

  return parsedId;
}

/**
 * Extracts and validates cookbook ID from server component params
 * Supports both UUID and Base32 encoded UUID formats
 */
export async function getCookbookIdParam(params: Promise<{ id: string }>): Promise<string> {
  const { id } = await params;
  const parsedId = parseUuidParam(id);
  if (!parsedId) notFound();

  return parsedId;
}

/**
 * Extracts and validates recipe ID from server component params
 * Supports both UUID and Base32 encoded UUID formats
 */
export async function getRecipeIdParam(params: Promise<{ recipeid: string }>): Promise<string> {
  const { recipeid } = await params;
  const parsedId = parseUuidParam(recipeid);
  if (!parsedId) notFound();

  return parsedId;
}

/**
 * Extracts and validates both cookbook and recipe IDs from server component params
 * Supports both UUID and Base32 encoded UUID formats
 */
export async function getCookbookAndRecipeIdParams(params: Promise<{ id: string; recipeid: string }>): Promise<{ cookbookId: string; recipeId: string }> {
  const { id, recipeid } = await params;

  const cookbookId = parseUuidParam(id);
  const recipeId = parseUuidParam(recipeid);

  if (!cookbookId || !recipeId) notFound();

  return { cookbookId, recipeId };
}
