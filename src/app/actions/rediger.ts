'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { recipes, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { log, Attr } from '@/lib/log';

// Redigering er en bevisst modus (egen side, aldri inne i bakeviewet) — men selve lagringen er
// én zod-parse og én update. Skjemaet på klienten sender hele utkastet som ett objekt.

const utkastSchema = z.object({
  tittel: z.string().trim().min(1, 'Oppskriften må ha en tittel'),
  beskrivelse: z.string().trim().transform((s) => s || null).nullable(),
  content: recipeContentSchema,
});

export async function oppdaterOppskrift(recipeId: string, utkast: unknown): Promise<{ feil: string } | void> {
  const userId = await getCurrentUserId();
  if (!userId) return { feil: 'Du må være logget inn for å redigere' };

  const parsed = utkastSchema.safeParse(utkast);
  if (!parsed.success) {
    const første = parsed.error.issues[0];
    return { feil: `${første.path.join('.')}: ${første.message}` };
  }

  const oppdatert = await db
    .update(recipes)
    .set({
      title: parsed.data.tittel,
      description: parsed.data.beskrivelse,
      content: parsed.data.content,
    })
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    .returning({ cookbookId: recipes.cookbookId })
    .maybeSingle('oppskrift.oppdater');
  if (!oppdatert) return { feil: 'Fant ikke oppskriften' };

  log.info(recipeId, Attr.RECIPE_UPDATED, { tittel: parsed.data.tittel });
  revalidatePath('/', 'layout');
  redirect(uuidHref`/kokebok/${oppdatert.cookbookId}/oppskrift/${recipeId}`);
}

export async function slettOppskrift(recipeId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const slettet = await withTransaction({ name: 'oppskrift.slett' }, async (tx) => {
    return tx
      .delete(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
      .returning({ cookbookId: recipes.cookbookId })
      .maybeSingle('oppskrift.slett');
  });
  if (!slettet) return;

  log.info(recipeId, Attr.RECIPE_DELETED, true);
  revalidatePath('/', 'layout');
  redirect(uuidHref`/kokebok/${slettet.cookbookId}`);
}
