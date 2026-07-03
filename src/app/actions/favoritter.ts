'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookbook, recipes, recipeFavorites } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { kanSeBok } from '@/lib/bok-tilgang';

// Hjertemerking: av/på per oppskrift. Favorittene samles som sin egen "bok" på hylla (/favoritter).
export async function toggleFavoritt(recipeId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  await withTransaction({ name: 'oppskrift.favoritt' }, async (tx) => {
    const slettet = await tx
      .delete(recipeFavorites)
      .where(and(eq(recipeFavorites.userId, userId), eq(recipeFavorites.recipeId, recipeId)))
      .returning({ id: recipeFavorites.id });
    if (slettet.length > 0) return;

    // hjertet kan bare settes på noe du får se — ditt eget eller en utstilt bok
    const bok = await tx
      .select({ userId: cookbook.userId })
      .from(recipes)
      .innerJoin(cookbook, eq(recipes.cookbookId, cookbook.id))
      .where(eq(recipes.id, recipeId))
      .maybeSingle('oppskrift.favoritt.bok');
    if (!bok || !kanSeBok(bok, userId)) return;

    await tx.insert(recipeFavorites).values({ userId, recipeId }).onConflictDoNothing();
  });

  revalidatePath('/', 'layout');
}
