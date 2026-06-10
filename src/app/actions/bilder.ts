'use server';

import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { recipes, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { lagreBilde, slettBilde } from '@/lib/lagring';
import { log, Attr } from '@/lib/log';

// Bilder av den ferdige retten: last opp fra mobilen, vi skalerer ned og lagrer som webp i
// objektlagringen, og nøkkelen legges i oppskriftens ferdigprodukt.bilder.

const MAKS_BILDE_BYTES = 15 * 1024 * 1024;
const MAKS_LANGSIDE_PX = 1600;
const WEBP_KVALITET = 80;

export async function lastOppRettBilde(recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const bilde = formData.get('bilde');
  if (!(bilde instanceof File) || bilde.size === 0) return;
  if (!bilde.type.startsWith('image/')) return;
  if (bilde.size > MAKS_BILDE_BYTES) return;

  // .rotate() retter opp etter EXIF-orientering og stripper metadataene i samme slengen
  const webp = await sharp(Buffer.from(await bilde.arrayBuffer()))
    .rotate()
    .resize({ width: MAKS_LANGSIDE_PX, height: MAKS_LANGSIDE_PX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_KVALITET })
    .toBuffer();

  const key = `oppskrift/${recipeId}/${randomUUID()}.webp`;
  await lagreBilde(key, webp, 'image/webp');

  // les-endre-skriv på jsonb-innholdet — én transaksjon så to samtidige opplastinger ikke
  // overskriver hverandres bilde
  await withTransaction({ name: 'oppskrift.bilde' }, async (tx) => {
    const rad = await tx
      .select({ content: recipes.content })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .maybeSingle('oppskrift.bilde');
    if (!rad) return;

    const content = recipeContentSchema.parse(rad.content);
    content.ferdigprodukt.bilder.push(key);

    await tx.update(recipes).set({ content }).where(eq(recipes.id, recipeId));
  });

  log.info(recipeId, Attr.RECIPE_PHOTO_ADDED, key);
  revalidatePath('/', 'layout');
}

export async function slettRettBilde(recipeId: string, key: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const fjernet = await withTransaction({ name: 'oppskrift.bilde-slett' }, async (tx) => {
    const rad = await tx
      .select({ content: recipes.content })
      .from(recipes)
      .where(eq(recipes.id, recipeId))
      .maybeSingle('oppskrift.bilde-slett');
    if (!rad) return false;

    const content = recipeContentSchema.parse(rad.content);
    if (!content.ferdigprodukt.bilder.includes(key)) return false;

    content.ferdigprodukt.bilder = content.ferdigprodukt.bilder.filter((b) => b !== key);
    await tx.update(recipes).set({ content }).where(eq(recipes.id, recipeId));

    return true;
  });
  if (!fjernet) return;

  await slettBilde(key);

  log.info(recipeId, Attr.RECIPE_PHOTO_DELETED, key);
  revalidatePath('/', 'layout');
}
