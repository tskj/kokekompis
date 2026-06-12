'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { users, fontValg } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';

// Skriftvalgene (innstillingene): brødteksten for hele siden, og skriften oppskriftene selv
// settes i — samme tre valg begge steder. Huskes på brukeren, som hyllesorteringen.
export async function settSkrift(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const tekstFont     = z.enum(fontValg).catch('montserrat').parse(formData.get('tekst'));
  const oppskriftFont = z.enum(fontValg).catch('montserrat').parse(formData.get('oppskrift'));

  await db.update(users).set({ tekstFont, oppskriftFont }).where(eq(users.id, userId));

  revalidatePath('/', 'layout');
}
