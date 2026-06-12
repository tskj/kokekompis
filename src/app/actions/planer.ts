'use server';

import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { and, eq, inArray, max } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { cookbook, plans, planRecipes, planPhotos, recipes } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { kanSeBok } from '@/lib/bok-tilgang';
import { GANGER_VALG } from '@/lib/skalering';
import { nowDate } from '@/lib/clock';
import { lagreBilde, slettBilde } from '@/lib/lagring';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { log, Attr } from '@/lib/log';

// Planene: 17. mai-frokosten, julebaksten, bursdagen. En plan er personlig og samler oppskrifter
// på tvers av bøkene — de refereres bare, så ingenting eies eller flyttes.

const navnSchema     = z.string().trim().min(1).max(100);
const datoSchema     = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null);
const merkeSchema    = z.string().trim().min(1).max(100).nullable().catch(null);
const personerSchema = z.coerce.number().int().min(1).max(10000).nullable().catch(null);

export async function opprettPlan(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const navn = navnSchema.safeParse(formData.get('navn'));
  if (!navn.success) return;

  const dato     = datoSchema.parse(formData.get('dato') || null);
  const merke    = merkeSchema.parse(formData.get('merke') || null);
  const personer = personerSchema.parse(formData.get('personer') || null);

  const plan = await db
    .insert(plans)
    .values({ userId, name: navn.data, dato, merke, personer })
    .returning({ id: plans.id })
    .single('plan.opprett');

  log.info(plan.id, Attr.PLAN_CREATED, navn.data);
  revalidatePath('/', 'layout');
  redirect(uuidHref`/planer/${plan.id}`);
}

// Etterordet — skrives når arrangementet er over (og kan rettes senere): hvor mange som kom,
// og dagboken med det man vil huske til neste år. Helt frivillig; planen ligger der uansett.
export async function evaluerPlan(planId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const kom    = z.coerce.number().int().min(0).max(10000).nullable().catch(null).parse(formData.get('kom') || null);
  const dagbok = z.string().trim().min(1).max(2000).nullable().catch(null).parse(formData.get('dagbok') || null);

  const endret = await db
    .update(plans)
    .set({ kom, dagbok })
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .returning({ id: plans.id })
    .maybeSingle('plan.evaluer');
  if (!endret) return;

  log.info(planId, Attr.PLAN_EVALUATED, { kom, harDagbok: dagbok !== null });
  revalidatePath('/', 'layout');
}

// Planer rives ikke ut — de legges i arkivet, og kan alltid hentes frem igjen.
export async function arkiverPlan(planId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const arkivert = await db
    .update(plans)
    .set({ arkivert: nowDate() })
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .returning({ id: plans.id })
    .maybeSingle('plan.arkiver');
  if (!arkivert) return;

  log.info(planId, Attr.PLAN_ARCHIVED, true);
  revalidatePath('/', 'layout');
  redirect('/planer');
}

export async function gjenåpnePlan(planId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const frem = await db
    .update(plans)
    .set({ arkivert: null })
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .returning({ id: plans.id })
    .maybeSingle('plan.gjenåpne');
  if (!frem) return;

  log.info(planId, Attr.PLAN_RESTORED, true);
  revalidatePath('/', 'layout');
}

// Sletting for godt finnes bare i arkivet, bak en er-du-sikker — og bildene i objektlagringen
// følger med planen ut.
export async function slettPlan(planId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const slettet = await withTransaction({ name: 'plan.slett' }, async (tx) => {
    const minPlan = await tx
      .select({ id: plans.id })
      .from(plans)
      .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
      .maybeSingle('plan.slett');
    if (!minPlan) return null;

    const bilder = await tx
      .select({ key: planPhotos.key })
      .from(planPhotos)
      .where(eq(planPhotos.planId, planId));

    await tx.delete(plans).where(eq(plans.id, planId));

    return { keys: bilder.map((bilde) => bilde.key) };
  });
  if (!slettet) return;

  for (const key of slettet.keys) await slettBilde(key);

  log.info(planId, Attr.PLAN_DELETED, true);
  revalidatePath('/', 'layout');
  redirect('/planer');
}

// Legg en oppskrift bakerst i en av dine planer — i størrelsen den står i akkurat nå (4×
// boller i planen er 4× mel på handlelisten). Oppskriften må være synlig for deg — din egen
// eller fra en utstilt bok; planen må være din. Ligger den der alt, oppdateres størrelsen.
export async function leggTilIPlan(recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const planId = parseUuidParam(String(formData.get('plan') ?? ''));
  if (!planId) return;

  const gangerTall = Number(formData.get('ganger') ?? 1);
  const ganger = (GANGER_VALG as readonly number[]).includes(gangerTall) ? gangerTall : 1;

  const lagtTil = await withTransaction({ name: 'plan.legg-til' }, async (tx) => {
    const minPlan = await tx
      .select({ id: plans.id })
      .from(plans)
      .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
      .maybeSingle('plan.legg-til.plan');
    if (!minPlan) return false;

    const bok = await tx
      .select({ userId: cookbook.userId, synlighet: cookbook.synlighet })
      .from(recipes)
      .innerJoin(cookbook, eq(recipes.cookbookId, cookbook.id))
      .where(eq(recipes.id, recipeId))
      .maybeSingle('plan.legg-til.bok');
    if (!bok || !kanSeBok(bok, userId)) return false;

    const { høyeste } = await tx
      .select({ høyeste: max(planRecipes.order) })
      .from(planRecipes)
      .where(eq(planRecipes.planId, planId))
      .single('plan.legg-til.maks');

    await tx
      .insert(planRecipes)
      .values({ planId, recipeId, order: (høyeste ?? 0) + 1, ganger })
      .onConflictDoUpdate({ target: [planRecipes.planId, planRecipes.recipeId], set: { ganger } });

    return true;
  });
  if (!lagtTil) return;

  log.info(planId, Attr.PLAN_RECIPE_ADDED, recipeId);
  revalidatePath('/', 'layout');
}

// Endre størrelsen på en rett som alt ligger i planen — eplekaken dobles rett fra plansiden,
// og handlelisten følger med.
export async function settPlanGanger(planId: string, recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const gangerTall = Number(formData.get('ganger'));
  if (!(GANGER_VALG as readonly number[]).includes(gangerTall)) return;

  const mine = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.userId, userId));

  await db
    .update(planRecipes)
    .set({ ganger: gangerTall })
    .where(and(
      eq(planRecipes.planId, planId),
      eq(planRecipes.recipeId, recipeId),
      inArray(planRecipes.planId, mine),
    ));

  revalidatePath('/', 'layout');
}

const MAKS_BILDE_BYTES = 15 * 1024 * 1024;
const MAKS_LANGSIDE_PX = 1600;

// Bilder fra arrangementet — det ferdige kakebordet. Samme pipeline som rettbildene: skaler
// ned, lagre som webp, nøkkelen i databasen.
export async function lastOppPlanBilde(planId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const bilde = formData.get('bilde');
  if (!(bilde instanceof File) || bilde.size === 0) return;
  if (!bilde.type.startsWith('image/')) return;
  if (bilde.size > MAKS_BILDE_BYTES) return;

  // eierskap sjekkes FØR skalering og opplasting — ingen skal fylle bøtta via andres planer
  const minPlan = await db
    .select({ id: plans.id })
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .exists();
  if (!minPlan) return;

  const webp = await sharp(Buffer.from(await bilde.arrayBuffer()))
    .rotate()
    .resize({ width: MAKS_LANGSIDE_PX, height: MAKS_LANGSIDE_PX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const key = `plan/${planId}/${randomUUID()}.webp`;
  await lagreBilde(key, webp, 'image/webp');
  await db.insert(planPhotos).values({ planId, key });

  log.info(planId, Attr.PLAN_PHOTO_ADDED, key);
  revalidatePath('/', 'layout');
}

export async function slettPlanBilde(bildeId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const mine = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.userId, userId));

  const slettet = await db
    .delete(planPhotos)
    .where(and(eq(planPhotos.id, bildeId), inArray(planPhotos.planId, mine)))
    .returning({ planId: planPhotos.planId, key: planPhotos.key })
    .maybeSingle('plan.bilde-slett');
  if (!slettet) return;

  await slettBilde(slettet.key);

  log.info(slettet.planId, Attr.PLAN_PHOTO_DELETED, slettet.key);
  revalidatePath('/', 'layout');
}

export async function fjernFraPlan(planId: string, recipeId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  // eierskapet sjekkes i where-leddet: raden må høre til en av dine planer
  const mine = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.userId, userId));

  await db
    .delete(planRecipes)
    .where(and(
      eq(planRecipes.planId, planId),
      eq(planRecipes.recipeId, recipeId),
      inArray(planRecipes.planId, mine),
    ));

  revalidatePath('/', 'layout');
}
