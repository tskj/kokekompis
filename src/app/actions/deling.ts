'use server';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookbook, cookbookShares, chapters, recipes, recipeChapters, recipeLinks, recipeShares, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { lesBåndValg } from '@/lib/bok-utseende';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';
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

// Venner skal lettvint få tak i gode oppskrifter: en delt oppskrift kan legges rett i en av
// dine egne bøker — en kopi som blir din (rettbildene blir hos giveren; opprinnelsen følger
// med i innholdet, som alltid).
export async function leggDeltOppskriftIBok(shareToken: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const målBokId = parseUuidParam(String(formData.get('bok') ?? ''));
  if (!målBokId) return;

  const kopi = await withTransaction({ name: 'oppskrift.delt-kopi' }, async (tx) => {
    const share = await tx
      .select({ recipeId: recipeShares.recipeId })
      .from(recipeShares)
      .where(eq(recipeShares.id, shareToken))
      .maybeSingle('oppskrift.delt-kopi.share');
    if (!share) return null;

    const minBok = await tx
      .select({ id: cookbook.id })
      .from(cookbook)
      .where(and(eq(cookbook.id, målBokId), eq(cookbook.userId, userId)))
      .maybeSingle('oppskrift.delt-kopi.bok');
    if (!minBok) return null;

    const original = await tx
      .select({ title: recipes.title, description: recipes.description, content: recipes.content })
      .from(recipes)
      .where(eq(recipes.id, share.recipeId))
      .single('oppskrift.delt-kopi.original');

    const content = recipeContentSchema.parse(original.content);
    content.ferdigprodukt.bilder = [];

    return tx
      .insert(recipes)
      .values({ userId, cookbookId: målBokId, title: original.title, description: original.description, content })
      .returning({ id: recipes.id })
      .single('oppskrift.delt-kopi.insert');
  });
  if (!kopi) return;

  log.info(kopi.id, Attr.RECIPE_COPIED_FROM_SHARE, shareToken);
  revalidatePath('/', 'layout');
  redirect(uuidHref`/kokebok/${målBokId}/oppskrift/${kopi.id}`);
}

// Del en hel bok — vennen får lese alt, og kan legge boken på sin egen hylle. Idempotent som
// oppskriftsdelingen: én lenke per bok, og bare eieren deler.
export async function delBok(cookbookId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const share = await withTransaction({ name: 'bok.del' }, async (tx) => {
    const minBok = await tx
      .select({ id: cookbook.id })
      .from(cookbook)
      .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
      .maybeSingle('bok.del.eier');
    if (!minBok) return null;

    const eksisterende = await tx
      .select({ id: cookbookShares.id })
      .from(cookbookShares)
      .where(eq(cookbookShares.cookbookId, cookbookId))
      .maybeSingle('bok.del');
    if (eksisterende) return eksisterende;

    return tx
      .insert(cookbookShares)
      .values({ cookbookId })
      .returning({ id: cookbookShares.id })
      .single('bok.del.insert');
  });
  if (!share) return;

  log.info(cookbookId, Attr.COOKBOOK_SHARED, share.id);
  redirect(uuidHref`/delt-bok/${share.id}`);
}

// Legg en delt bok på din egen hylle: en full kopi — kapitler, oppskrifter og se-også-lenker —
// som blir din og er privat. Utkast og rettbilder blir hos giveren; opplastet bokbånd likeså.
export async function leggDeltBokPåHylla(shareToken: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const nyBok = await withTransaction({ name: 'bok.delt-kopi' }, async (tx) => {
    const share = await tx
      .select({ cookbookId: cookbookShares.cookbookId })
      .from(cookbookShares)
      .where(eq(cookbookShares.id, shareToken))
      .maybeSingle('bok.delt-kopi.share');
    if (!share) return null;

    const original = await tx
      .select({ name: cookbook.name, farge: cookbook.farge, headerBilde: cookbook.headerBilde, beskrivelse: cookbook.beskrivelse, skisse: cookbook.skisse })
      .from(cookbook)
      .where(eq(cookbook.id, share.cookbookId))
      .single('bok.delt-kopi.original');

    const bånd = original.headerBilde && lesBåndValg(original.headerBilde) ? original.headerBilde : null;

    const ny = await tx
      .insert(cookbook)
      .values({ userId, name: original.name, farge: original.farge, headerBilde: bånd, beskrivelse: original.beskrivelse, skisse: original.skisse })
      .returning({ id: cookbook.id })
      .single('bok.delt-kopi.bok');

    // kapitlene, med kart fra gamle til nye ider
    const gamleKapitler = await tx
      .select()
      .from(chapters)
      .where(eq(chapters.cookbookId, share.cookbookId));

    const kapittelKart = new Map<string, string>();
    for (const kapittel of gamleKapitler) {
      const nytt = await tx
        .insert(chapters)
        .values({ cookbookId: ny.id, name: kapittel.name, order: kapittel.order })
        .returning({ id: chapters.id })
        .single('bok.delt-kopi.kapittel');
      kapittelKart.set(kapittel.id, nytt.id);
    }

    // oppskriftene (uten utkast), rettbildene blir hos giveren
    const gamleOppskrifter = await tx
      .select()
      .from(recipes)
      .where(and(eq(recipes.cookbookId, share.cookbookId), isNull(recipes.utkastAv)));

    const oppskriftKart = new Map<string, string>();
    for (const oppskrift of gamleOppskrifter) {
      const content = recipeContentSchema.parse(oppskrift.content);
      content.ferdigprodukt.bilder = [];

      const nyOppskrift = await tx
        .insert(recipes)
        .values({ userId, cookbookId: ny.id, title: oppskrift.title, description: oppskrift.description, content })
        .returning({ id: recipes.id })
        .single('bok.delt-kopi.oppskrift');
      oppskriftKart.set(oppskrift.id, nyOppskrift.id);
    }

    // kapittel-koblingene og se-også-lenkene, oversatt gjennom kartene
    const koblinger = kapittelKart.size > 0
      ? await tx
          .select()
          .from(recipeChapters)
          .where(inArray(recipeChapters.chapterId, [...kapittelKart.keys()]))
      : [];

    for (const kobling of koblinger) {
      const recipeId = oppskriftKart.get(kobling.recipeId);
      const chapterId = kapittelKart.get(kobling.chapterId);
      if (recipeId && chapterId) await tx.insert(recipeChapters).values({ recipeId, chapterId, order: kobling.order });
    }

    const lenker = oppskriftKart.size > 0
      ? await tx
          .select()
          .from(recipeLinks)
          .where(inArray(recipeLinks.fromRecipeId, [...oppskriftKart.keys()]))
      : [];

    for (const lenke of lenker) {
      const fromRecipeId = oppskriftKart.get(lenke.fromRecipeId);
      const toRecipeId = oppskriftKart.get(lenke.toRecipeId);
      if (fromRecipeId && toRecipeId) await tx.insert(recipeLinks).values({ fromRecipeId, toRecipeId });
    }

    return ny;
  });
  if (!nyBok) return;

  log.info(nyBok.id, Attr.COOKBOOK_COPIED_FROM_SHARE, shareToken);
  revalidatePath('/', 'layout');
  redirect(uuidHref`/kokebok/${nyBok.id}`);
}
