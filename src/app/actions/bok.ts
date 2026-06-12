'use server';

import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { and, asc, eq, max, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { cookbook, chapters, users, bokSynligheter, bokFarger, hylleSorteringer } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { lesBåndValg, erSkisse } from '@/lib/bok-utseende';
import { lagreBilde, slettBilde } from '@/lib/lagring';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { log, Attr } from '@/lib/log';

// Bok-stell: opprette en ny bok på hylla, døpe den om, og legge til kapitler. Navn valideres
// likt overalt; eierskap sjekkes på endringene (en bok er personlig).

const navnSchema = z.string().trim().min(1).max(100);

export async function opprettBok(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const navn = navnSchema.safeParse(formData.get('navn'));
  if (!navn.success) return;

  const bok = await db
    .insert(cookbook)
    .values({ userId, name: navn.data })
    .returning({ id: cookbook.id })
    .single('bok.opprett');

  log.info(bok.id, Attr.COOKBOOK_CREATED, navn.data);
  revalidatePath('/', 'layout');
  redirect(uuidHref`/kokebok/${bok.id}`);
}

export async function endreBokNavn(cookbookId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const navn = navnSchema.safeParse(formData.get('navn'));
  if (!navn.success) return;

  const endret = await db
    .update(cookbook)
    .set({ name: navn.data })
    .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
    .returning({ id: cookbook.id })
    .maybeSingle('bok.endre-navn');
  if (!endret) return;

  log.info(cookbookId, Attr.COOKBOOK_RENAMED, navn.data);
  revalidatePath('/', 'layout');
}

// Hvordan hylla sorteres: din egen rekkefølge (pilene på bokryggene) eller sist åpnet.
// Valget huskes på brukeren, ikke i URL-en — hylla skal stå slik du forlot den.
export async function settHylleSortering(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const sortering = z.enum(hylleSorteringer).safeParse(formData.get('sortering'));
  if (!sortering.success) return;

  await db.update(users).set({ hylleSortering: sortering.data }).where(eq(users.id, userId));

  revalidatePath('/', 'layout');
}

// Hele hyllas rekkefølge i ett jafs — fra trykk-og-dra. Bare dine egne bøker telles med;
// fremmede ids hopper vi over, og egne bøker som mangler i listen legges bakerst slik
// visningen alt sorterer dem.
export async function lagreHylleRekkefølge(bokIds: unknown) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  // klientkall over nettet — parse, ikke stol
  const ønskede = z.array(z.string()).safeParse(bokIds);
  if (!ønskede.success) return;

  await withTransaction({ name: 'bok.hylle-rekkefølge' }, async (tx) => {
    const mine = await tx
      .select({ id: cookbook.id })
      .from(cookbook)
      .where(eq(cookbook.userId, userId))
      .orderBy(sql`${cookbook.rekkefølge} asc nulls last`, asc(cookbook.name));

    const ønsket = ønskede.data.filter((id) => mine.some((bok) => bok.id === id));
    const rest = mine.map((bok) => bok.id).filter((id) => !ønsket.includes(id));

    for (const [plass, id] of [...ønsket, ...rest].entries()) {
      await tx.update(cookbook).set({ rekkefølge: plass + 1 }).where(eq(cookbook.id, id));
    }
  });

  revalidatePath('/', 'layout');
}

// Flytt en bok mot venstre eller høyre i din egen rekkefølge. Hele hylla normaliseres til
// 1..n ved hvert bytte — bøker som aldri er sortert (null) står da bakerst i navnerekkefølge,
// samme rekkefølge som visningen bruker, så pilene flytter alltid det øyet ser.
export async function flyttBokPåHylla(cookbookId: string, retning: 'venstre' | 'høyre', formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  await withTransaction({ name: 'bok.flytt-på-hylla' }, async (tx) => {
    const bøker = await tx
      .select({ id: cookbook.id })
      .from(cookbook)
      .where(eq(cookbook.userId, userId))
      .orderBy(sql`${cookbook.rekkefølge} asc nulls last`, asc(cookbook.name));

    const index = bøker.findIndex((bok) => bok.id === cookbookId);
    if (index === -1) return;

    const nabo = retning === 'venstre' ? index - 1 : index + 1;
    if (nabo < 0 || nabo >= bøker.length) return;

    [bøker[index], bøker[nabo]] = [bøker[nabo], bøker[index]];

    for (const [plass, bok] of bøker.entries()) {
      await tx.update(cookbook).set({ rekkefølge: plass + 1 }).where(eq(cookbook.id, bok.id));
    }
  });

  revalidatePath('/', 'layout');
}

export async function settBokFarge(cookbookId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const farge = z.enum(bokFarger).safeParse(formData.get('farge'));
  if (!farge.success) return;

  const endret = await db
    .update(cookbook)
    .set({ farge: farge.data })
    .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
    .returning({ id: cookbook.id })
    .maybeSingle('bok.farge');
  if (!endret) return;

  log.info(cookbookId, Attr.COOKBOOK_STYLED, { farge: farge.data });
  revalidatePath('/', 'layout');
}

// Bytter bokbåndet (stripen mellom tittel og innhold) til et mønster i valgt bokfarge — eller
// fjerner det. Lagres normalisert som "mønster:farge". Lå det et opplastet bilde der fra før,
// ryddes filen bort etterpå.
export async function settBokBånd(cookbookId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const valg = String(formData.get('valg') ?? '');
  const båndValg = lesBåndValg(valg);
  if (valg !== 'fjern' && !båndValg) return;

  const gammelt = await withTransaction({ name: 'bok.bånd' }, async (tx) => {
    const bok = await tx
      .select({ headerBilde: cookbook.headerBilde })
      .from(cookbook)
      .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
      .maybeSingle('bok.bånd');
    if (!bok) return null;

    await tx
      .update(cookbook)
      .set({ headerBilde: båndValg ? `${båndValg.mønster}:${båndValg.farge}` : null })
      .where(eq(cookbook.id, cookbookId));

    return { headerBilde: bok.headerBilde };
  });
  if (!gammelt) return;

  if (gammelt.headerBilde?.startsWith('bok/')) await slettBilde(gammelt.headerBilde);

  log.info(cookbookId, Attr.COOKBOOK_STYLED, { bånd: valg });
  revalidatePath('/', 'layout');
}

const MAKS_BÅND_BYTES = 15 * 1024 * 1024;
const BÅND_BREDDE_PX  = 1600;
const BÅND_HØYDE_PX   = 400;

// Eget bilde som bokbånd: skaleres og beskjæres til den smale stripen, lagres som webp i
// objektlagringen, og nøkkelen legges på boken. Erstattet bilde ryddes bort.
export async function lastOppBokBånd(cookbookId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const bilde = formData.get('bilde');
  if (!(bilde instanceof File) || bilde.size === 0) return;
  if (!bilde.type.startsWith('image/')) return;
  if (bilde.size > MAKS_BÅND_BYTES) return;

  // eierskap sjekkes FØR skalering og opplasting — ingen skal fylle bøtta via andres bøker
  const minBok = await db
    .select({ id: cookbook.id })
    .from(cookbook)
    .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
    .exists();
  if (!minBok) return;

  const webp = await sharp(Buffer.from(await bilde.arrayBuffer()))
    .rotate()
    .resize({ width: BÅND_BREDDE_PX, height: BÅND_HØYDE_PX, fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  const key = `bok/${cookbookId}/baand-${randomUUID()}.webp`;
  await lagreBilde(key, webp, 'image/webp');

  const gammelt = await withTransaction({ name: 'bok.bånd-bilde' }, async (tx) => {
    const bok = await tx
      .select({ headerBilde: cookbook.headerBilde })
      .from(cookbook)
      .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
      .maybeSingle('bok.bånd-bilde');
    if (!bok) return null;

    await tx.update(cookbook).set({ headerBilde: key }).where(eq(cookbook.id, cookbookId));

    return { headerBilde: bok.headerBilde };
  });
  if (!gammelt) return;

  if (gammelt.headerBilde?.startsWith('bok/')) await slettBilde(gammelt.headerBilde);

  log.info(cookbookId, Attr.COOKBOOK_STYLED, { bånd: key });
  revalidatePath('/', 'layout');
}

// Bokens forside: noen ord om boken og en valgfri tegnet skisse — det man møter når ingen
// oppskrift er slått opp.
export async function settBokForside(cookbookId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const beskrivelse = z.string().trim().min(1).max(500).nullable().catch(null).parse(formData.get('beskrivelse') || null);
  const skisseValg = String(formData.get('skisse') ?? 'ingen');
  const skisse = erSkisse(skisseValg) ? skisseValg : null;

  const endret = await db
    .update(cookbook)
    .set({ beskrivelse, skisse })
    .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
    .returning({ id: cookbook.id })
    .maybeSingle('bok.forside');
  if (!endret) return;

  log.info(cookbookId, Attr.COOKBOOK_STYLED, { skisse, harBeskrivelse: beskrivelse !== null });
  revalidatePath('/', 'layout');
}

// Privat ↔ utstilt. En utstilt bok står fremme på forsiden og kan leses av alle — det er slik
// Marens utvalg møter en utlogget gjest.
export async function settBokSynlighet(cookbookId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const synlighet = z.enum(bokSynligheter).safeParse(formData.get('synlighet'));
  if (!synlighet.success) return;

  const endret = await db
    .update(cookbook)
    .set({ synlighet: synlighet.data })
    .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
    .returning({ id: cookbook.id })
    .maybeSingle('bok.synlighet');
  if (!endret) return;

  log.info(cookbookId, Attr.COOKBOOK_VISIBILITY, synlighet.data);
  revalidatePath('/', 'layout');
}

export async function nyttKapittel(cookbookId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const navn = navnSchema.safeParse(formData.get('navn'));
  if (!navn.success) return;

  await withTransaction({ name: 'bok.nytt-kapittel' }, async (tx) => {
    // boken må være din — skjemaverdier er utrustet input
    const bok = await tx
      .select({ id: cookbook.id })
      .from(cookbook)
      .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
      .maybeSingle('bok.nytt-kapittel');
    if (!bok) return;

    const { høyeste } = await tx
      .select({ høyeste: max(chapters.order) })
      .from(chapters)
      .where(eq(chapters.cookbookId, cookbookId))
      .single('bok.nytt-kapittel.makskorder');

    await tx.insert(chapters).values({
      cookbookId,
      name: navn.data,
      order: (høyeste ?? 0) + 1,
    });
  });

  log.info(cookbookId, Attr.CHAPTER_CREATED, navn.data);
  revalidatePath('/', 'layout');
}
