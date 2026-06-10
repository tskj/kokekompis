'use server';

import { and, eq, inArray, max } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { chapters, recipeChapters, recipes } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';

// Flytt en oppskrift mellom kapitler — eller ut av alle ("ingen" = ukategorisert). Boken eier
// oppskriften uansett (recipes.cookbookId); kapitlene er bare kategorisering.
export async function flyttOppskrift(recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const valg = String(formData.get('kapittel') ?? '');
  const målKapittelId = valg === 'ingen' ? null : parseUuidParam(valg);
  if (valg !== 'ingen' && !målKapittelId) return;

  await withTransaction({ name: 'oppskrift.flytt' }, async (tx) => {
    const oppskrift = await tx
      .select({ cookbookId: recipes.cookbookId })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
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
