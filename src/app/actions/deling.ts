'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { recipeShares } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { log, Attr } from '@/lib/log';

// Lager (eller gjenbruker) delingslenken for en oppskrift og sender brukeren dit. Én lenke per
// oppskrift — å dele to ganger gir samme URL, så en lenke som er sendt rundt aldri dør.
export async function delOppskrift(recipeId: string) {
  const share = await withTransaction({ name: 'oppskrift.del' }, async (tx) => {
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

  log.info(recipeId, Attr.RECIPE_SHARED, share.id);
  redirect(uuidHref`/delt/${share.id}`);
}
