'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { recipeNotes, notatFarger } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';
import { log, Attr } from '@/lib/log';

// Postit-lappene: små personlige notater klistret på en oppskrift. Skjemaene poster hit som
// rene <form action>-er — ingen klient-JS, lappen ligger i databasen når siden rendres på nytt.

const notatSchema = z.object({
  tekst: z.string().trim().min(1).max(500),
  farge: z.enum(notatFarger).catch('terrakotta'),
});

export async function leggTilNotat(recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const parsed = notatSchema.safeParse({ tekst: formData.get('tekst'), farge: formData.get('farge') });
  if (!parsed.success) return;

  await db.insert(recipeNotes).values({
    recipeId,
    userId,
    tekst: parsed.data.tekst,
    farge: parsed.data.farge,
  });

  log.info(recipeId, Attr.RECIPE_NOTE_ADDED, { farge: parsed.data.farge });
  revalidatePath('/', 'layout');
}

export async function slettNotat(notatId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const slettet = await db
    .delete(recipeNotes)
    .where(and(eq(recipeNotes.id, notatId), eq(recipeNotes.userId, userId)))
    .returning({ recipeId: recipeNotes.recipeId });
  if (slettet.length === 0) return;

  log.info(slettet[0].recipeId, Attr.RECIPE_NOTE_DELETED, notatId);
  revalidatePath('/', 'layout');
}
