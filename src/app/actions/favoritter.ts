'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { recipeFavorites } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';

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

    await tx.insert(recipeFavorites).values({ userId, recipeId }).onConflictDoNothing();
  });

  revalidatePath('/', 'layout');
}
