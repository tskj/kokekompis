'use server';

import { z } from 'zod';
import { and, asc, desc, eq, gt, inArray, lt, max, ne, notInArray, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { chapters, cookbook, recipes, recipeChapters, recipeLinks } from '@/lib/db/schema';
import { withTransaction, type Tx } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';
import { log, Attr } from '@/lib/log';

// Kapittel-stell: døpe om en seksjonsoverskrift, bytte plass i innholdslista, og flytte hele
// kapittelet — med oppskriftene sine — over i en annen av dine bøker.

export type Retning = 'opp' | 'ned';

const navnSchema = z.string().trim().min(1).max(100);

// Kapittelet må være ditt, via boken det står i — alle stell-handlingene starter her.
async function mittKapittel(tx: Tx, kapittelId: string, userId: string) {
  return tx
    .select({ id: chapters.id, cookbookId: chapters.cookbookId, order: chapters.order })
    .from(chapters)
    .innerJoin(cookbook, eq(chapters.cookbookId, cookbook.id))
    .where(and(eq(chapters.id, kapittelId), eq(cookbook.userId, userId)))
    .maybeSingle('kapittel.mitt');
}

export async function endreKapittelNavn(kapittelId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const navn = navnSchema.safeParse(formData.get('navn'));
  if (!navn.success) return;

  // én atomisk update — eierskapet sjekkes i where-leddet via bøkene dine
  const mine = db
    .select({ id: cookbook.id })
    .from(cookbook)
    .where(eq(cookbook.userId, userId));

  const endret = await db
    .update(chapters)
    .set({ name: navn.data })
    .where(and(eq(chapters.id, kapittelId), inArray(chapters.cookbookId, mine)))
    .returning({ cookbookId: chapters.cookbookId })
    .maybeSingle('kapittel.endre-navn');
  if (!endret) return;

  log.info(endret.cookbookId, Attr.CHAPTER_RENAMED, navn.data);
  revalidatePath('/', 'layout');
}

// Bytt plass med naboen i flytteretningen. Unik (bok, order) håndheves umiddelbart, så byttet
// går via en ledig plass bakerst. Øverst/nederst finnes ingen nabo — da skjer ingenting.
export async function flyttKapittel(kapittelId: string, retning: Retning, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  await withTransaction({ name: 'kapittel.flytt' }, async (tx) => {
    const kapittel = await mittKapittel(tx, kapittelId, userId);
    if (!kapittel) return;

    const nabo = await tx
      .select({ id: chapters.id, order: chapters.order })
      .from(chapters)
      .where(and(
        eq(chapters.cookbookId, kapittel.cookbookId),
        retning === 'opp' ? lt(chapters.order, kapittel.order) : gt(chapters.order, kapittel.order),
      ))
      .orderBy(retning === 'opp' ? desc(chapters.order) : asc(chapters.order))
      .maybeFirst('kapittel.flytt.nabo');
    if (!nabo) return;

    const { høyeste } = await tx
      .select({ høyeste: max(chapters.order) })
      .from(chapters)
      .where(eq(chapters.cookbookId, kapittel.cookbookId))
      .single('kapittel.flytt.maks');

    await tx.update(chapters).set({ order: (høyeste ?? 0) + 1 }).where(eq(chapters.id, kapittel.id));
    await tx.update(chapters).set({ order: kapittel.order }).where(eq(chapters.id, nabo.id));
    await tx.update(chapters).set({ order: nabo.order }).where(eq(chapters.id, kapittel.id));
  });

  revalidatePath('/', 'layout');
}

// Flytt hele kapittelet til en annen av dine bøker. Boken eier oppskriftene, så de flytter med.
// Det som ville krysset bokgrensen ryker: koblinger til andre kapitler i den gamle boken, og
// "se også"-lenker mellom flyttede og gjenværende oppskrifter.
export async function flyttKapittelTilBok(kapittelId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const målBokId = parseUuidParam(String(formData.get('bok') ?? ''));
  if (!målBokId) return;

  const flyttet = await withTransaction({ name: 'kapittel.flytt-bok' }, async (tx) => {
    const kapittel = await mittKapittel(tx, kapittelId, userId);
    if (!kapittel || kapittel.cookbookId === målBokId) return null;

    // målet må også være din bok — skjemaverdier er utrustet input
    const målBok = await tx
      .select({ id: cookbook.id })
      .from(cookbook)
      .where(and(eq(cookbook.id, målBokId), eq(cookbook.userId, userId)))
      .maybeSingle('kapittel.flytt-bok.mål');
    if (!målBok) return null;

    const flyttes = await tx
      .select({ recipeId: recipeChapters.recipeId })
      .from(recipeChapters)
      .where(eq(recipeChapters.chapterId, kapittelId));
    const flytteIds = flyttes.map((rad) => rad.recipeId);

    if (flytteIds.length > 0) {
      const andreKapitlerIGamleBoken = tx
        .select({ id: chapters.id })
        .from(chapters)
        .where(and(eq(chapters.cookbookId, kapittel.cookbookId), ne(chapters.id, kapittelId)));

      await tx
        .delete(recipeChapters)
        .where(and(
          inArray(recipeChapters.recipeId, flytteIds),
          inArray(recipeChapters.chapterId, andreKapitlerIGamleBoken),
        ));

      await tx
        .delete(recipeLinks)
        .where(or(
          and(inArray(recipeLinks.fromRecipeId, flytteIds),    notInArray(recipeLinks.toRecipeId, flytteIds)),
          and(notInArray(recipeLinks.fromRecipeId, flytteIds), inArray(recipeLinks.toRecipeId, flytteIds)),
        ));

      await tx.update(recipes).set({ cookbookId: målBokId }).where(inArray(recipes.id, flytteIds));
    }

    const { høyeste } = await tx
      .select({ høyeste: max(chapters.order) })
      .from(chapters)
      .where(eq(chapters.cookbookId, målBokId))
      .single('kapittel.flytt-bok.maks');

    await tx
      .update(chapters)
      .set({ cookbookId: målBokId, order: (høyeste ?? 0) + 1 })
      .where(eq(chapters.id, kapittelId));

    return { fra: kapittel.cookbookId };
  });
  if (!flyttet) return;

  log.info(flyttet.fra, Attr.CHAPTER_MOVED, { kapittelId, til: målBokId });
  revalidatePath('/', 'layout');
}

// Bytt plass på en oppskrift og naboen dens innad i kapittelet — samme via-ledig-plass-dans
// som for kapitler, på unik (kapittel, order).
export async function flyttOppskriftIKapittel(kapittelId: string, recipeId: string, retning: Retning, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  await withTransaction({ name: 'kapittel.flytt-oppskrift' }, async (tx) => {
    const rad = await tx
      .select({ id: recipeChapters.id, order: recipeChapters.order })
      .from(recipeChapters)
      .innerJoin(chapters, eq(recipeChapters.chapterId, chapters.id))
      .innerJoin(cookbook, eq(chapters.cookbookId, cookbook.id))
      .where(and(
        eq(recipeChapters.chapterId, kapittelId),
        eq(recipeChapters.recipeId, recipeId),
        eq(cookbook.userId, userId),
      ))
      .maybeSingle('kapittel.flytt-oppskrift');
    if (!rad) return;

    const nabo = await tx
      .select({ id: recipeChapters.id, order: recipeChapters.order })
      .from(recipeChapters)
      .where(and(
        eq(recipeChapters.chapterId, kapittelId),
        retning === 'opp' ? lt(recipeChapters.order, rad.order) : gt(recipeChapters.order, rad.order),
      ))
      .orderBy(retning === 'opp' ? desc(recipeChapters.order) : asc(recipeChapters.order))
      .maybeFirst('kapittel.flytt-oppskrift.nabo');
    if (!nabo) return;

    const { høyeste } = await tx
      .select({ høyeste: max(recipeChapters.order) })
      .from(recipeChapters)
      .where(eq(recipeChapters.chapterId, kapittelId))
      .single('kapittel.flytt-oppskrift.maks');

    await tx.update(recipeChapters).set({ order: (høyeste ?? 0) + 1 }).where(eq(recipeChapters.id, rad.id));
    await tx.update(recipeChapters).set({ order: rad.order }).where(eq(recipeChapters.id, nabo.id));
    await tx.update(recipeChapters).set({ order: nabo.order }).where(eq(recipeChapters.id, rad.id));
  });

  revalidatePath('/', 'layout');
}
