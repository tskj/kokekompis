'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { cookbook, recipes, recipeMarginalia, krusseduller } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { kanSeBok } from '@/lib/bok-tilgang';
import { log, Attr } from '@/lib/log';

// Margskriften: håndskrevne påminnelser rett i margen på oppskriften — "MÅ heve over natten!" —
// gjerne med en krussedull under. Personlig som lappene; følger ikke med ved deling.

const tekstSchema = z.string().trim().min(1).max(200);

export async function skrivIMargen(recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const tekst = tekstSchema.safeParse(formData.get('tekst'));
  if (!tekst.success) return;

  const krussedull = z.enum(krusseduller).nullable().catch(null).parse(formData.get('krussedull') || null);

  const skrevet = await withTransaction({ name: 'margskrift.skriv' }, async (tx) => {
    // margen er personlig, men oppskriften må være synlig for deg — din egen eller utstilt
    const bok = await tx
      .select({ userId: cookbook.userId, synlighet: cookbook.synlighet })
      .from(recipes)
      .innerJoin(cookbook, eq(recipes.cookbookId, cookbook.id))
      .where(eq(recipes.id, recipeId))
      .maybeSingle('margskrift.skriv.bok');
    if (!bok || !kanSeBok(bok, userId)) return false;

    await tx.insert(recipeMarginalia).values({ recipeId, userId, tekst: tekst.data, krussedull });

    return true;
  });
  if (!skrevet) return;

  log.info(recipeId, Attr.RECIPE_MARGINALIA_ADDED, { krussedull });
  revalidatePath('/', 'layout');
}

export async function slettMarginal(marginalId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const slettet = await db
    .delete(recipeMarginalia)
    .where(and(eq(recipeMarginalia.id, marginalId), eq(recipeMarginalia.userId, userId)))
    .returning({ recipeId: recipeMarginalia.recipeId })
    .maybeSingle('margskrift.slett');
  if (!slettet) return;

  log.info(slettet.recipeId, Attr.RECIPE_MARGINALIA_DELETED, marginalId);
  revalidatePath('/', 'layout');
}
