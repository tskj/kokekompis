'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { users, tekstFonter, oppskriftFonter } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';

// Skriftvalgene («Aa skrift» på forsiden): brødteksten for hele siden, og skriften oppskriftene
// selv settes i. Huskes på brukeren, som hyllesorteringen.
export async function settSkrift(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const tekstFont     = z.enum(tekstFonter).catch('standard').parse(formData.get('tekst'));
  const oppskriftFont = z.enum(oppskriftFonter).catch('standard').parse(formData.get('oppskrift'));

  await db.update(users).set({ tekstFont, oppskriftFont }).where(eq(users.id, userId));

  revalidatePath('/', 'layout');
}
