'use server';

import { z } from 'zod';
import { and, eq, inArray, max } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { cookbook, plans, planRecipes, recipes } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { kanSeBok } from '@/lib/bok-tilgang';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { log, Attr } from '@/lib/log';

// Planene: 17. mai-frokosten, julebaksten, bursdagen. En plan er personlig og samler oppskrifter
// på tvers av bøkene — de refereres bare, så ingenting eies eller flyttes.

const navnSchema = z.string().trim().min(1).max(100);
const datoSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null);

export async function opprettPlan(formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const navn = navnSchema.safeParse(formData.get('navn'));
  if (!navn.success) return;

  const dato = datoSchema.parse(formData.get('dato') || null);

  const plan = await db
    .insert(plans)
    .values({ userId, name: navn.data, dato })
    .returning({ id: plans.id })
    .single('plan.opprett');

  log.info(plan.id, Attr.PLAN_CREATED, navn.data);
  revalidatePath('/', 'layout');
  redirect(uuidHref`/planer/${plan.id}`);
}

export async function slettPlan(planId: string, formData: FormData) {
  void formData;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const slettet = await db
    .delete(plans)
    .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
    .returning({ id: plans.id })
    .maybeSingle('plan.slett');
  if (!slettet) return;

  log.info(planId, Attr.PLAN_DELETED, true);
  revalidatePath('/', 'layout');
  redirect('/planer');
}

// Legg en oppskrift bakerst i en av dine planer. Oppskriften må være synlig for deg — din egen
// eller fra en utstilt bok; planen må være din. Å legge til samme oppskrift to ganger er no-op.
export async function leggTilIPlan(recipeId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const planId = parseUuidParam(String(formData.get('plan') ?? ''));
  if (!planId) return;

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
      .values({ planId, recipeId, order: (høyeste ?? 0) + 1 })
      .onConflictDoNothing();

    return true;
  });
  if (!lagtTil) return;

  log.info(planId, Attr.PLAN_RECIPE_ADDED, recipeId);
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
