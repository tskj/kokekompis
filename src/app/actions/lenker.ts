'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { recipes, recipeLinks } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';

// Manuelle lenker innad i boken: skolebollen peker på vaniljekremen. Lenken er en rettet kant;
// visningen viser også baklenkene ("Brukes i"), så begge oppskriftene finner hverandre.

export async function lenkOppskrifter(fromRecipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const toRecipeId = parseUuidParam(String(formData.get('til') ?? ''));
  if (!toRecipeId || toRecipeId === fromRecipeId) return;

  await withTransaction({ name: 'oppskrift.lenk' }, async (tx) => {
    // begge endene må finnes, i samme bok, og være dine — skjemaverdier er utrustet input
    const fra = await tx
      .select({ cookbookId: recipes.cookbookId, userId: recipes.userId })
      .from(recipes)
      .where(eq(recipes.id, fromRecipeId))
      .maybeSingle('oppskrift.lenk.fra');
    const til = await tx
      .select({ cookbookId: recipes.cookbookId })
      .from(recipes)
      .where(eq(recipes.id, toRecipeId))
      .maybeSingle('oppskrift.lenk.til');
    if (!fra || !til || fra.cookbookId !== til.cookbookId || fra.userId !== userId) return;

    await tx.insert(recipeLinks).values({ fromRecipeId, toRecipeId }).onConflictDoNothing();
  });

  revalidatePath('/', 'layout');
}

export async function fjernLenke(linkId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  // lenken hører til oppskriften den peker fra — bare dens eier får fjerne den
  const mine = db
    .select({ id: recipes.id })
    .from(recipes)
    .where(eq(recipes.userId, userId));

  await db
    .delete(recipeLinks)
    .where(and(eq(recipeLinks.id, linkId), inArray(recipeLinks.fromRecipeId, mine)));

  revalidatePath('/', 'layout');
}
