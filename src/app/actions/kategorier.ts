'use server';

import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { recipes, recipeKategorier } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';

// Kategorier: merkelapper som samler oppskrifter på tvers av bøkene («suppe», «pai»).
// Navnet normaliseres til små bokstaver så samme kategori aldri finnes i to stavinger.

const navnSchema = z.string().trim().toLowerCase().min(1).max(40);

export async function leggTilKategori(recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const navn = navnSchema.safeParse(formData.get('navn'));
  if (!navn.success) return;

  await withTransaction({ name: 'oppskrift.kategori' }, async (tx) => {
    // bare dine egne oppskrifter, og aldri utkast
    const min = await tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId), isNull(recipes.utkastAv)))
      .exists();
    if (!min) return;

    await tx
      .insert(recipeKategorier)
      .values({ recipeId, userId, navn: navn.data })
      .onConflictDoNothing();
  });

  revalidatePath('/', 'layout');
}

export async function fjernKategori(kategoriId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  await db
    .delete(recipeKategorier)
    .where(and(eq(recipeKategorier.id, kategoriId), eq(recipeKategorier.userId, userId)));

  revalidatePath('/', 'layout');
}
