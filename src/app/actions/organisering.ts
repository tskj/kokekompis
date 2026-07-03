'use server';

import { and, eq, inArray, isNull, max, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { chapters, cookbook, recipeChapters, recipes } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';
import { uuidHref } from '@/lib/uuid/uuid-links';

// Flytt en oppskrift mellom kapitler ("ingen" = ukategorisert) — eller til en annen av dine
// bøker ("bok:<id>", f.eks. når den ble lagt inn i feil bok). Boken eier oppskriften
// (recipes.cookbookId); kapitlene er bare kategorisering.
export async function flyttOppskrift(recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const valg = String(formData.get('kapittel') ?? '');
  if (valg.startsWith('bok:')) return flyttTilBok(recipeId, userId, valg.slice('bok:'.length));

  const målKapittelId = valg === 'ingen' ? null : parseUuidParam(valg);
  if (valg !== 'ingen' && !målKapittelId) return;

  await withTransaction({ name: 'oppskrift.flytt' }, async (tx) => {
    // utkast bor på originalens side og skal aldri inn i et kapittel
    const oppskrift = await tx
      .select({ cookbookId: recipes.cookbookId })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId), isNull(recipes.utkastAv)))
      .maybeSingle('oppskrift.flytt.oppskrift');
    if (!oppskrift) return;

    const kapitlerIBoken = tx
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.cookbookId, oppskrift.cookbookId));

    if (målKapittelId) {
      // målet må være et kapittel i samme bok — skjemaverdier er utrustet input
      const mål = await tx
        .select({ id: chapters.id })
        .from(chapters)
        .where(and(eq(chapters.id, målKapittelId), eq(chapters.cookbookId, oppskrift.cookbookId)))
        .maybeSingle('oppskrift.flytt.mål');
      if (!mål) return;
    }

    await tx
      .delete(recipeChapters)
      .where(and(eq(recipeChapters.recipeId, recipeId), inArray(recipeChapters.chapterId, kapitlerIBoken)));

    if (målKapittelId) {
      const { høyeste } = await tx
        .select({ høyeste: max(recipeChapters.order) })
        .from(recipeChapters)
        .where(eq(recipeChapters.chapterId, målKapittelId))
        .single('oppskrift.flytt.makskorder');

      await tx.insert(recipeChapters).values({
        recipeId,
        chapterId: målKapittelId,
        order:     (høyeste ?? 0) + 1,
      });
    }
  });

  revalidatePath('/', 'layout');
}

// Flytting til en annen bok: oppskriften bytter cookbookId (utkastene følger med), og faller
// ut av kapitlene sine — den gamle bokens kapitler finnes ikke i den nye. Favoritter, lapper
// og lenker peker på oppskrifts-id-en og består. Til slutt hopper vi dit oppskriften flyttet,
// så man ser at den kom vel frem.
async function flyttTilBok(recipeId: string, userId: string, målParam: string) {
  const målBokId = parseUuidParam(målParam);
  if (!målBokId) return;

  const flyttet = await withTransaction({ name: 'oppskrift.flytt-bok' }, async (tx) => {
    const oppskrift = await tx
      .select({ cookbookId: recipes.cookbookId })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId), isNull(recipes.utkastAv)))
      .maybeSingle('oppskrift.flytt-bok.oppskrift');
    if (!oppskrift) return false;
    if (oppskrift.cookbookId === målBokId) return false;

    // målet må være din egen bok, og stå på hylla — ikke i arkivet
    const målBok = await tx
      .select({ id: cookbook.id })
      .from(cookbook)
      .where(and(eq(cookbook.id, målBokId), eq(cookbook.userId, userId), isNull(cookbook.arkivert)))
      .maybeSingle('oppskrift.flytt-bok.mål');
    if (!målBok) return false;

    const kapitlerIGammelBok = tx
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.cookbookId, oppskrift.cookbookId));

    await tx
      .delete(recipeChapters)
      .where(and(eq(recipeChapters.recipeId, recipeId), inArray(recipeChapters.chapterId, kapitlerIGammelBok)));

    await tx
      .update(recipes)
      .set({ cookbookId: målBokId })
      .where(or(eq(recipes.id, recipeId), eq(recipes.utkastAv, recipeId)));

    return true;
  });

  revalidatePath('/', 'layout');
  if (flyttet) redirect(uuidHref`/kokebok/${målBokId}/oppskrift/${recipeId}`);
}
