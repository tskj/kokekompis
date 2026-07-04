'use server';

import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { oppslag, users } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { lesBåndValg } from '@/lib/bok-utseende';
import { lagreBilde, slettBilde } from '@/lib/lagring';
import { log, Attr } from '@/lib/log';

// Egne oppslag i Oppslagsboka — det DU alltid må google, skrevet opp én gang for alle.

const tittelSchema = z.string().trim().min(1).max(100);
const tekstSchema  = z.string().trim().min(1).max(2000);

export async function nyttOppslag(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const tittel = tittelSchema.safeParse(formData.get('tittel'));
  const tekst  = tekstSchema.safeParse(formData.get('tekst'));
  if (!tittel.success || !tekst.success) return;

  const rad = await db
    .insert(oppslag)
    .values({ userId, tittel: tittel.data, tekst: tekst.data })
    .returning({ id: oppslag.id })
    .single('oppslag.nytt');

  log.info(rad.id, Attr.OPPSLAG_CREATED, tittel.data);
  revalidatePath('/oppslag');
  // rett til det man nettopp skrev — boken slår seg opp der
  redirect(`/oppslag/${encodeUuidToBase32(rad.id)}`);
}

export async function slettOppslag(oppslagId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const slettet = await db
    .delete(oppslag)
    .where(and(eq(oppslag.id, oppslagId), eq(oppslag.userId, userId)))
    .returning({ id: oppslag.id })
    .maybeSingle('oppslag.slett');
  if (!slettet) return;

  log.info(oppslagId, Attr.OPPSLAG_DELETED, true);
  revalidatePath('/oppslag');
  // oppslaget man sto i finnes ikke lenger — hjem til bokens forside
  redirect('/oppslag');
}

// Oppslagsbokas bånd — samme drakt-valg som kokebøkene (mønster i bokfarge, eller eget bilde),
// men lagret på brukeren: Oppslagsboka er én per person, ikke en rad i cookbook.

export async function settOppslagBånd(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const valg = String(formData.get('valg') ?? '');
  const båndValg = lesBåndValg(valg);
  if (valg !== 'fjern' && !båndValg) return;

  const gammelt = await withTransaction({ name: 'oppslag.bånd' }, async (tx) => {
    const bruker = await tx
      .select({ oppslagBånd: users.oppslagBånd })
      .from(users)
      .where(eq(users.id, userId))
      .maybeSingle('oppslag.bånd');
    if (!bruker) return null;

    await tx
      .update(users)
      .set({ oppslagBånd: båndValg ? `${båndValg.mønster}:${båndValg.farge}` : null })
      .where(eq(users.id, userId));

    return { oppslagBånd: bruker.oppslagBånd };
  });
  if (!gammelt) return;

  if (gammelt.oppslagBånd?.startsWith('oppslag/')) await slettBilde(gammelt.oppslagBånd);

  revalidatePath('/oppslag');
}

const MAKS_BÅND_BYTES = 15 * 1024 * 1024;
const BÅND_BREDDE_PX  = 1600;
const BÅND_HØYDE_PX   = 400;

// Eget bilde som bånd i Oppslagsboka: skaleres og beskjæres til den smale stripen, lagres som
// webp i objektlagringen, og nøkkelen legges på brukeren. Erstattet bilde ryddes bort.
export async function lastOppOppslagBånd(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const bilde = formData.get('bilde');
  if (!(bilde instanceof File) || bilde.size === 0) return;
  if (!bilde.type.startsWith('image/')) return;
  if (bilde.size > MAKS_BÅND_BYTES) return;

  const webp = await sharp(Buffer.from(await bilde.arrayBuffer()))
    .rotate()
    .resize({ width: BÅND_BREDDE_PX, height: BÅND_HØYDE_PX, fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();

  const key = `oppslag/${userId}/baand-${randomUUID()}.webp`;
  await lagreBilde(key, webp, 'image/webp');

  const gammelt = await withTransaction({ name: 'oppslag.bånd-bilde' }, async (tx) => {
    const bruker = await tx
      .select({ oppslagBånd: users.oppslagBånd })
      .from(users)
      .where(eq(users.id, userId))
      .maybeSingle('oppslag.bånd-bilde');
    if (!bruker) return null;

    await tx.update(users).set({ oppslagBånd: key }).where(eq(users.id, userId));

    return { oppslagBånd: bruker.oppslagBånd };
  });
  if (!gammelt) {
    await slettBilde(key);
    return;
  }

  if (gammelt.oppslagBånd?.startsWith('oppslag/')) await slettBilde(gammelt.oppslagBånd);

  revalidatePath('/oppslag');
}
