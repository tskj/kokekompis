'use server';

import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { recipes, recipeNotes } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { nowDate } from '@/lib/clock';
import { getCurrentUserId } from '@/lib/current-user';
import { log, Attr } from '@/lib/log';

// Prøvd-flyten: en oppskrift er «ikke prøvd ennå» til kokken sier fra. Da svarer man på om den
// falt i smak, om den skal stå fremme eller legges i bokens arkiv, og kan gi seg selv innspill
// til neste gang — de blir en lapp festet på oppskriften.

const prøvdSchema = z.object({
  likte:    z.enum(['ja', 'nei']),
  skjebne:  z.enum(['behold', 'arkiver']),
  innspill: z.string().trim().max(500),
});

export async function settPrøvd(recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const svar = prøvdSchema.safeParse({
    likte:    formData.get('likte'),
    skjebne:  formData.get('skjebne'),
    innspill: String(formData.get('innspill') ?? ''),
  });
  if (!svar.success) return;

  await withTransaction({ name: 'oppskrift.prøvd' }, async (tx) => {
    // bare dine egne, og aldri utkast — de er eksperimenter, ikke retter i boken
    const oppskrift = await tx
      .select({ prøvd: recipes.prøvd })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId), isNull(recipes.utkastAv)))
      .maybeSingle('oppskrift.prøvd');
    if (!oppskrift) return;

    await tx
      .update(recipes)
      .set({
        prøvd:    oppskrift.prøvd ?? nowDate(),
        likte:    svar.data.likte === 'ja',
        arkivert: svar.data.skjebne === 'arkiver' ? nowDate() : null,
      })
      .where(eq(recipes.id, recipeId));

    if (svar.data.innspill) {
      await tx.insert(recipeNotes).values({
        recipeId,
        userId,
        tekst: svar.data.innspill,
        farge: 'rav',
        plass: 'oppe',
      });
    }
  });

  log.info(recipeId, Attr.RECIPE_TRIED, { likte: svar.data.likte, skjebne: svar.data.skjebne });
  revalidatePath('/', 'layout');
}

// Angre hele prøvd-statusen — oppskriften står som ny, og hentes ut av arkivet om den lå der.
export async function nullstillPrøvd(recipeId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  await db
    .update(recipes)
    .set({ prøvd: null, likte: null, arkivert: null })
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)));

  revalidatePath('/', 'layout');
}

// Hent oppskriften ut av bokens arkiv — prøvd-statusen består, den bare står fremme igjen.
export async function gjenopprettFraArkiv(recipeId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  await db
    .update(recipes)
    .set({ arkivert: null })
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)));

  revalidatePath('/', 'layout');
}
