import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';
import { plans, planRecipes } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { nowDate } from '@/lib/clock';
import { formaterDag, erTidligereDag } from '@/lib/dato';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { opprettPlan, gjenåpnePlan, slettPlan } from '@/app/actions/planer';
import { BekreftKnapp } from '@/components/BekreftKnapp';

// Planene: nesten en kokebok, men for en anledning — 17. mai-frokosten, julebaksten, bursdagen.
// Kommende planer samler det som skal lages; tidligere arrangementer er hukommelsen — menyen,
// hvor mange det ble laget til, og etterordet om hva som ble for mye og for lite.
export default async function PlanerSide() {
  const userId = await getCurrentUserId();

  const planer = userId
    ? await withTransaction({ name: 'planer.liste' }, async (tx) => {
        const mine = await tx
          .select({ id: plans.id, name: plans.name, dato: plans.dato, merke: plans.merke, personer: plans.personer, kom: plans.kom, dagbok: plans.dagbok, arkivert: plans.arkivert })
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

  const iDag = nowDate().toISOString().slice(0, 10);

  const aktive = planer.filter((plan) => !plan.arkivert);
  const arkiverte = planer.filter((plan) => plan.arkivert);

  const kommende = aktive.filter((plan) => !erTidligereDag(plan.dato, iDag));
  const tidligere = aktive
    .filter((plan) => erTidligereDag(plan.dato, iDag))
    .sort((a, b) => (b.dato ?? '').localeCompare(a.dato ?? ''));

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
          {kommende.length > 0 && (
            <ul className="mb-10 divide-y divide-line border-y border-line">
              {kommende.map((plan) => (
                <li key={plan.id}>
                  <Link
                    href={uuidHref`/planer/${plan.id}`}
                    className="group flex items-baseline justify-between gap-4 py-4 hover:text-terra"
                  >
                    <span>
                      <span className="font-display text-2xl">{plan.name}</span>
                      <span className="block text-sm text-ink-soft">
                        {plan.dato && `${formaterDag(plan.dato)} · `}
                        {plan.personer && `for ${plan.personer} · `}
                        {plan.antall === 1 ? '1 oppskrift' : `${plan.antall} oppskrifter`}
                      </span>
                    </span>
                    <span aria-hidden className="text-ink-soft group-hover:text-terra">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <details className="group max-w-md" open={kommende.length === 0}>
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
                  placeholder="17. mai-frokost 2027"
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 font-display focus:border-terra focus:outline-none"
                />
              </label>

              <div className="flex gap-3">
                <label className="block flex-1 text-sm">
                  <span className="text-ink-soft">Når? (valgfritt)</span>
                  <input
                    type="date"
                    name="dato"
                    className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
                  />
                </label>

                <label className="block w-28 text-sm">
                  <span className="text-ink-soft">For hvor mange?</span>
                  <input
                    type="number"
                    name="personer"
                    min={1}
                    max={10000}
                    placeholder="12"
                    className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="text-ink-soft">Merke (valgfritt) — binder årene sammen: «17. mai», «julaften»</span>
                <input
                  name="merke"
                  maxLength={100}
                  placeholder="17. mai"
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
                />
              </label>

              <button type="submit" className="rounded-full bg-terra px-4 py-2 text-sm font-medium text-paper hover:bg-terra-deep">
                Legg planen
              </button>
            </form>
          </details>

          {tidligere.length > 0 && (
            <section aria-labelledby="tidligere" className="mt-14">
              <h2 id="tidligere" className="mb-1.5 text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                Tidligere arrangementer
              </h2>
              <p className="mb-4 text-sm text-ink-soft">
                Menyene, mengdene og etterordene — så neste år blir bedre enn i fjor.
              </p>

              <ul className="divide-y divide-line border-y border-line">
                {tidligere.map((plan) => (
                  <li key={plan.id}>
                    <Link
                      href={uuidHref`/planer/${plan.id}`}
                      className="group flex items-baseline justify-between gap-4 py-4 hover:text-terra"
                    >
                      <span>
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-display text-2xl">{plan.name}</span>
                          {plan.merke && (
                            <span className="rounded-full border border-sage/50 bg-sage/10 px-2.5 py-0.5 text-xs">{plan.merke}</span>
                          )}
                        </span>
                        <span className="block text-sm text-ink-soft">
                          {plan.dato && `${formaterDag(plan.dato)} · `}
                          {plan.kom !== null && `${plan.kom} kom${plan.personer ? ` av ${plan.personer} planlagt` : ''} · `}
                          {plan.dagbok
                            ? <span className="font-skrift text-base">«{plan.dagbok.length > 80 ? `${plan.dagbok.slice(0, 80)}…` : plan.dagbok}»</span>
                            : <span className="italic">✎ etterordet er ikke skrevet ennå</span>}
                        </span>
                      </span>
                      <span aria-hidden className="text-ink-soft group-hover:text-terra">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {arkiverte.length > 0 && (
            <details className="mt-14">
              <summary className="cursor-pointer list-none text-sm text-ink-soft underline underline-offset-2 hover:text-terra">
                Arkivet ({arkiverte.length})
              </summary>

              <ul className="mt-3 divide-y divide-line border-y border-line">
                {arkiverte.map((plan) => (
                  <li key={plan.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                    <Link href={uuidHref`/planer/${plan.id}`} className="hover:text-terra">
                      <span className="font-display text-lg">{plan.name}</span>
                      {plan.dato && <span className="ml-2 text-sm text-ink-soft">{formaterDag(plan.dato)}</span>}
                    </Link>

                    <span className="flex items-center gap-3 text-sm">
                      <form action={gjenåpnePlan.bind(null, plan.id)}>
                        <button type="submit" className="underline underline-offset-2 hover:text-terra">hent frem</button>
                      </form>
                      <form action={slettPlan.bind(null, plan.id)}>
                        <BekreftKnapp
                          spørsmål={`Slette «${plan.name}» for godt? Det kan ikke angres — meny, etterord og bilder følger med.`}
                          className="text-ink/50 underline underline-offset-2 hover:text-terra"
                        >
                          slett for godt
                        </BekreftKnapp>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </main>
  );
}
