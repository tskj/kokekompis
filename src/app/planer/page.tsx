import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';
import { plans, planRecipes } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { formaterDag } from '@/lib/dato';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { opprettPlan } from '@/app/actions/planer';

// Planene: nesten en kokebok, men for en anledning — 17. mai-frokosten, julebaksten, bursdagen.
// Samle det du skal lage fra alle bøkene dine, og få én handleliste for hele bordet.
export default async function PlanerSide() {
  const userId = await getCurrentUserId();

  const planer = userId
    ? await withTransaction({ name: 'planer.liste' }, async (tx) => {
        const mine = await tx
          .select({ id: plans.id, name: plans.name, dato: plans.dato })
          .from(plans)
          .where(eq(plans.userId, userId))
          .orderBy(asc(plans.dato), asc(plans.name));

        const antall = await tx
          .select({ planId: planRecipes.planId, antall: count() })
          .from(planRecipes)
          .groupBy(planRecipes.planId);

        return mine.map((plan) => ({
          ...plan,
          antall: antall.find((rad) => rad.planId === plan.id)?.antall ?? 0,
        }));
      })
    : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <Link href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>
        <h1 className="mt-1 font-display text-5xl">Planer</h1>
        <p className="mt-2 font-display italic text-lg text-ink-soft">
          17. mai-frokosten, julebaksten, bursdagen — samle det du skal lage, fra alle bøkene dine.
        </p>
      </header>

      {!userId ? (
        <p className="text-ink-soft">Logg inn for å legge planer.</p>
      ) : (
        <>
          {planer.length > 0 && (
            <ul className="mb-10 divide-y divide-line border-y border-line">
              {planer.map((plan) => (
                <li key={plan.id}>
                  <Link
                    href={uuidHref`/planer/${plan.id}`}
                    className="group flex items-baseline justify-between gap-4 py-4 hover:text-terra"
                  >
                    <span>
                      <span className="font-display text-2xl">{plan.name}</span>
                      <span className="block text-sm text-ink-soft">
                        {plan.dato && `${formaterDag(plan.dato)} · `}
                        {plan.antall === 1 ? '1 oppskrift' : `${plan.antall} oppskrifter`}
                      </span>
                    </span>
                    <span aria-hidden className="text-ink-soft group-hover:text-terra">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <details className="group max-w-md" open={planer.length === 0}>
            <summary className="cursor-pointer list-none border-2 border-dashed border-line px-4 py-3 text-center text-sm text-ink-soft hover:border-terra hover:text-terra group-open:hidden">
              + Ny plan — «17. mai-frokost», «Julebakst»
            </summary>

            <form action={opprettPlan} className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
              <label className="block text-sm">
                <span className="text-ink-soft">Hva planlegger du?</span>
                <input
                  name="navn"
                  required
                  maxLength={100}
                  placeholder="17. mai-frokost"
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 font-display focus:border-terra focus:outline-none"
                />
              </label>

              <label className="block text-sm">
                <span className="text-ink-soft">Når skal det stå på bordet? (valgfritt)</span>
                <input
                  type="date"
                  name="dato"
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
                />
              </label>

              <button type="submit" className="rounded-full bg-terra px-4 py-2 text-sm font-medium text-paper hover:bg-terra-deep">
                Legg planen
              </button>
            </form>
          </details>
        </>
      )}
    </main>
  );
}
