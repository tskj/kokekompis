import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookbook, plans, planRecipes, recipes, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { kanSeBok } from '@/lib/bok-tilgang';
import { lagHandleliste } from '@/lib/handleliste';
import { formaterDag } from '@/lib/dato';
import { getUuidParam } from '@/lib/uuid/server-uuid-params';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { Handleliste } from '@/components/oppskrift/Handleliste';
import { Kaffeflekk } from '@/components/Kaffeflekk';
import { PrintKnapp } from '@/components/PrintKnapp';
import { fjernFraPlan, slettPlan } from '@/app/actions/planer';

interface PlanSideProps {
  params: Promise<{ id: string }>;
}

// Én plan: oppskriftene som skal på bordet, og handlelisten for alt sammen — summert på tvers
// av oppskriftene. Planen er personlig; oppskrifter fra bøker som siden er gjort private for
// deg, holdes utenfor både listen og handlelisten.
export default async function PlanSide({ params }: PlanSideProps) {
  const planId = getUuidParam(await params, 'id');

  const userId = await getCurrentUserId();
  if (!userId) notFound();

  const data = await withTransaction({ name: 'plan.side' }, async (tx) => {
    const plan = await tx
      .select({ id: plans.id, name: plans.name, dato: plans.dato })
      .from(plans)
      .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
      .maybeSingle('plan.side');
    if (!plan) return null;

    const rader = await tx
      .select({
        recipeId: recipes.id,
        cookbookId: recipes.cookbookId,
        title: recipes.title,
        content: recipes.content,
        ganger: planRecipes.ganger,
        bokEier: cookbook.userId,
        synlighet: cookbook.synlighet,
      })
      .from(planRecipes)
      .innerJoin(recipes, eq(planRecipes.recipeId, recipes.id))
      .innerJoin(cookbook, eq(recipes.cookbookId, cookbook.id))
      .where(eq(planRecipes.planId, planId))
      .orderBy(asc(planRecipes.order));

    return { plan, rader };
  });
  if (!data) notFound();

  const synlige = data.rader.filter((rad) => kanSeBok({ userId: rad.bokEier, synlighet: rad.synlighet }, userId));

  // handlelisten regnes fra oppskriftenes innhold ved visning, ganget med størrelsen hver rett
  // ble lagt til i — en rad som ikke parser hopper bare over, den skal ikke velte hele planen
  const retter = synlige.flatMap((rad) => {
    const content = recipeContentSchema.safeParse(rad.content);
    return content.success ? [{ content: content.data, ganger: rad.ganger }] : [];
  });

  const tilbake = encodeURIComponent(uuidHref`/planer/${planId}`);

  return (
    <main className="relative mx-auto max-w-3xl px-6 py-12">
      {/* dekor nederst/ytterst — utenfor innholdet */}
      <Kaffeflekk className="absolute bottom-0 -left-28 w-44 rotate-12 skjul-ved-print" />

      <header className="mb-8 skjul-ved-print">
        <Link href="/planer" className="text-sm text-ink-soft hover:text-terra">← Planer</Link>

        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="mt-1 font-display text-5xl">{data.plan.name}</h1>

          <form action={slettPlan.bind(null, planId)}>
            <button type="submit" className="text-sm text-ink-soft underline underline-offset-2 hover:text-terra">
              Riv ut planen
            </button>
          </form>
        </div>

        {data.plan.dato && (
          <p className="mt-2 font-display italic text-lg text-ink-soft">{formaterDag(data.plan.dato)}</p>
        )}

        <div aria-hidden className="mt-4 border-b-4 border-double border-ink/25" />
      </header>

      <section aria-label="Oppskriftene i planen" className="skjul-ved-print">
        {synlige.length === 0 ? (
          <p className="text-ink-soft">
            Ingen oppskrifter ennå — gå inn på en oppskrift og velg «Til plan …», så samles den her.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {synlige.map((rad) => (
              <li key={rad.recipeId} className="flex items-baseline justify-between gap-4 py-3">
                <span className="flex items-baseline gap-2">
                  <Link
                    href={`${uuidHref`/kokebok/${rad.cookbookId}/oppskrift/${rad.recipeId}`}?tilbake=${tilbake}${rad.ganger !== 1 ? `&ganger=${rad.ganger}` : ''}`}
                    className="font-display text-xl hover:text-terra"
                  >
                    {rad.title}
                  </Link>
                  {rad.ganger !== 1 && (
                    <span className="rounded-full bg-terra px-2 py-0.5 text-sm font-medium text-paper">
                      {rad.ganger === 0.5 ? '½' : rad.ganger}×
                    </span>
                  )}
                </span>

                <form action={fjernFraPlan.bind(null, planId, rad.recipeId)}>
                  <button
                    type="submit"
                    aria-label={`Ta ${rad.title} ut av planen`}
                    title="Ta den ut av planen"
                    className="size-7 rounded-full text-ink/40 hover:bg-ink/10 hover:text-ink"
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {retter.length > 0 && (
        <section aria-labelledby="handleliste" className="mt-10">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="handleliste" className="font-display text-3xl">Handleliste</h2>
            <span className="skjul-ved-print"><PrintKnapp /></span>
          </div>

          <p className="mb-4 text-sm text-ink-soft skjul-ved-print">
            Alt fra alle oppskriftene, i størrelsene de skal lages i — samme vare i samme mål blir én linje.
          </p>

          <Handleliste linjer={lagHandleliste(retter)} />
        </section>
      )}
    </main>
  );
}
