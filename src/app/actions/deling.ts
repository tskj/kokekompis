'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { recipes, recipeShares } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { log, Attr } from '@/lib/log';

// Lager (eller gjenbruker) delingslenken for en oppskrift og sender brukeren dit. Én lenke per
// oppskrift — å dele to ganger gir samme URL, så en lenke som er sendt rundt aldri dør.
// Kun eieren deler: en delingslenke åpner oppskriften for hele verden.
export async function delOppskrift(recipeId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const share = await withTransaction({ name: 'oppskrift.del' }, async (tx) => {
    const minOppskrift = await tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
      .maybeSingle('oppskrift.del.eier');
    if (!minOppskrift) return null;

    const eksisterende = await tx
      .select({ id: recipeShares.id })
      .from(recipeShares)
      .where(eq(recipeShares.recipeId, recipeId))
      .maybeSingle('oppskrift.del');
    if (eksisterende) return eksisterende;

    return tx
      .insert(recipeShares)
      .values({ recipeId })
      .returning({ id: recipeShares.id })
      .single('oppskrift.del.insert');
  });
  if (!share) return;

  log.info(recipeId, Attr.RECIPE_SHARED, share.id);
  redirect(uuidHref`/delt/${share.id}`);
}
