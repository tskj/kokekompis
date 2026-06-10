'use server';

import { z } from 'zod';
import { and, eq, max } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { cookbook, chapters } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
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
