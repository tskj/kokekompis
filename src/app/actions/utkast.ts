'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { recipes } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { log, Attr } from '@/lib/log';

// Utkast: en kopi av oppskriften å eksperimentere i — originalen står urørt til utkastet
// eventuelt tas i bruk. Et utkast av et utkast blir et søsken (samme original), så benken
// aldri blir et slektstre.

export async function lagUtkast(recipeId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const utkast = await withTransaction({ name: 'utkast.lag' }, async (tx) => {
    const kilde = await tx
      .select({
        cookbookId: recipes.cookbookId,
        title: recipes.title,
        description: recipes.description,
        content: recipes.content,
        utkastAv: recipes.utkastAv,
      })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
      .maybeSingle('utkast.lag.kilde');
    if (!kilde) return null;

    return tx
      .insert(recipes)
      .values({
        userId,
        cookbookId: kilde.cookbookId,
        title: kilde.title,
        description: kilde.description,
        content: kilde.content,
        utkastAv: kilde.utkastAv ?? recipeId,
      })
      .returning({ id: recipes.id, cookbookId: recipes.cookbookId })
      .single('utkast.lag.insert');
  });
  if (!utkast) return;

  log.info(recipeId, Attr.RECIPE_DRAFTED, utkast.id);
  revalidatePath('/', 'layout');
  redirect(uuidHref`/kokebok/${utkast.cookbookId}/oppskrift/${utkast.id}`);
}

// Ta utkastet i bruk: skriv tittel, beskrivelse og innhold over originalen, og rydd utkastet
// bort. Lapper og kommentarer på originalen består — det er innholdet som byttes.
export async function taIBrukUtkast(draftId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const original = await withTransaction({ name: 'utkast.ta-i-bruk' }, async (tx) => {
    const utkast = await tx
      .select({
        title: recipes.title,
        description: recipes.description,
        content: recipes.content,
        utkastAv: recipes.utkastAv,
      })
      .from(recipes)
      .where(and(eq(recipes.id, draftId), eq(recipes.userId, userId)))
      .maybeSingle('utkast.ta-i-bruk.utkast');
    if (!utkast?.utkastAv) return null;

    const oppdatert = await tx
      .update(recipes)
      .set({ title: utkast.title, description: utkast.description, content: utkast.content })
      .where(eq(recipes.id, utkast.utkastAv))
      .returning({ id: recipes.id, cookbookId: recipes.cookbookId })
      .single('utkast.ta-i-bruk.original');

    await tx.delete(recipes).where(eq(recipes.id, draftId));

    return oppdatert;
  });
  if (!original) return;

  log.info(original.id, Attr.RECIPE_DRAFT_ADOPTED, draftId);
  revalidatePath('/', 'layout');
  redirect(uuidHref`/kokebok/${original.cookbookId}/oppskrift/${original.id}`);
}

export async function forkastUtkast(draftId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const slettet = await withTransaction({ name: 'utkast.forkast' }, async (tx) => {
    const utkast = await tx
      .select({ utkastAv: recipes.utkastAv, cookbookId: recipes.cookbookId })
      .from(recipes)
      .where(and(eq(recipes.id, draftId), eq(recipes.userId, userId)))
      .maybeSingle('utkast.forkast');
    if (!utkast?.utkastAv) return null;

    await tx.delete(recipes).where(eq(recipes.id, draftId));

    return { original: utkast.utkastAv, cookbookId: utkast.cookbookId };
  });
  if (!slettet) return;

  log.info(slettet.original, Attr.RECIPE_DRAFT_DISCARDED, draftId);
  revalidatePath('/', 'layout');
  redirect(uuidHref`/kokebok/${slettet.cookbookId}/oppskrift/${slettet.original}`);
}
