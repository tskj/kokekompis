'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { cookbook, recipes, recipeComments, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { kanSeBok } from '@/lib/bok-tilgang';
import { log, Attr } from '@/lib/log';

// Marg-kommentarene: google docs på sida av oppskriften — "oi, denne ble svidd i kantene, prøv
// mindre egg neste gang", hengt på akkurat det steget det gjelder. Personlige som lappene.

const tekstSchema = z.string().trim().min(1).max(500);

export async function leggTilKommentar(recipeId: string, stegId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const tekst = tekstSchema.safeParse(formData.get('tekst'));
  if (!tekst.success) return;

  const lagtTil = await withTransaction({ name: 'kommentar.legg-til' }, async (tx) => {
    // kommentaren er personlig, men oppskriften må være synlig for deg — og steget må finnes
    const rad = await tx
      .select({ content: recipes.content, bokEier: cookbook.userId })
      .from(recipes)
      .innerJoin(cookbook, eq(recipes.cookbookId, cookbook.id))
      .where(eq(recipes.id, recipeId))
      .maybeSingle('kommentar.legg-til.bok');
    if (!rad || !kanSeBok({ userId: rad.bokEier }, userId)) return false;

    const content = recipeContentSchema.safeParse(rad.content);
    if (!content.success || !content.data.steg.some((steg) => steg.id === stegId)) return false;

    await tx.insert(recipeComments).values({ recipeId, userId, stegId, tekst: tekst.data });

    return true;
  });
  if (!lagtTil) return;

  log.info(recipeId, Attr.RECIPE_COMMENT_ADDED, { stegId });
  revalidatePath('/', 'layout');
}

export async function slettKommentar(kommentarId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const slettet = await db
    .delete(recipeComments)
    .where(and(eq(recipeComments.id, kommentarId), eq(recipeComments.userId, userId)))
    .returning({ recipeId: recipeComments.recipeId })
    .maybeSingle('kommentar.slett');
  if (!slettet) return;

  log.info(slettet.recipeId, Attr.RECIPE_COMMENT_DELETED, kommentarId);
  revalidatePath('/', 'layout');
}
