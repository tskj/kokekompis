'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { oppslag } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';
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
}
