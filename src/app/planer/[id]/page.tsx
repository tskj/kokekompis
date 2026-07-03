import Link from 'next/link';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookbook, plans, planRecipes, planPhotos, recipes, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { GANGER_VALG } from '@/lib/skalering';
import { bildeUrl } from '@/lib/lagring';
import { getCurrentUserId } from '@/lib/current-user';
import { BildeInput } from '@/components/BildeInput';
import { kanSeBok } from '@/lib/bok-tilgang';
import { lagHandleliste } from '@/lib/handleliste';
import { nowDate } from '@/lib/clock';
import { formaterDag, erTidligereDag } from '@/lib/dato';
import { getUuidParam } from '@/lib/uuid/server-uuid-params';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { Handleliste } from '@/components/oppskrift/Handleliste';
import { Kaffeflekk } from '@/components/Kaffeflekk';
import { PrintKnapp } from '@/components/PrintKnapp';
import { arkiverPlan, gjenåpnePlan, evaluerPlan, fjernFraPlan, settPlanGanger, lastOppPlanBilde, slettPlanBilde } from '@/app/actions/planer';
import { LukkbarDetails } from '@/components/LukkbarDetails';

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
      .select({ id: plans.id, name: plans.name, dato: plans.dato, merke: plans.merke, personer: plans.personer, kom: plans.kom, dagbok: plans.dagbok, arkivert: plans.arkivert })
      .from(plans)
      .where(and(eq(plans.id, planId), eq(plans.userId, userId)))
      .maybeSingle('plan.side');
    if (!plan) return null;

    const bilder = await tx
      .select({ id: planPhotos.id, key: planPhotos.key })
      .from(planPhotos)
      .where(eq(planPhotos.planId, planId))
      .orderBy(asc(planPhotos.createdAt));

    // tradisjonen: andre planer med samme merke — fjorårets meny, mengder og etterord
    const sammeMerke = plan.merke
      ? await tx
          .select({ id: plans.id, name: plans.name, dato: plans.dato, personer: plans.personer, kom: plans.kom, dagbok: plans.dagbok })
          .from(plans)
          .where(and(eq(plans.userId, userId), eq(plans.merke, plan.merke), ne(plans.id, planId)))
          .orderBy(desc(plans.dato))
      : [];

    const rader = await tx
      .select({
        recipeId: recipes.id,
        cookbookId: recipes.cookbookId,
        title: recipes.title,
        content: recipes.content,
        ganger: planRecipes.ganger,
        bokEier: cookbook.userId,
      })
      .from(planRecipes)
      .innerJoin(recipes, eq(planRecipes.recipeId, recipes.id))
      .innerJoin(cookbook, eq(recipes.cookbookId, cookbook.id))
      .where(eq(planRecipes.planId, planId))
      .orderBy(asc(planRecipes.order));

    return { plan, sammeMerke, rader, bilder };
  });
  if (!data) notFound();

  const bilder = await Promise.all(data.bilder.map(async (bilde) => ({ ...bilde, url: await bildeUrl(bilde.key) })));

  const iDag = nowDate().toISOString().slice(0, 10);

  const erTidligere = erTidligereDag(data.plan.dato, iDag);
  const harEtterord = data.plan.kom !== null || data.plan.dagbok !== null;

  // handlelisten regnes fra oppskriftenes innhold ved visning, ganget med størrelsen hver rett
  // skal lages i — en rad som ikke parser hopper bare over, den skal ikke velte hele planen
  const synlige = data.rader
    .filter((rad) => kanSeBok({ userId: rad.bokEier }, userId))
    .map((rad) => ({ ...rad, parsed: recipeContentSchema.safeParse(rad.content) }));

  const retter = synlige.flatMap((rad) => (rad.parsed.success ? [{ content: rad.parsed.data, ganger: rad.ganger }] : []));

  const tilbake = encodeURIComponent(uuidHref`/planer/${planId}`);

  return (
    <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
      {/* dekor nederst/ytterst — utenfor innholdet */}
      <Kaffeflekk className="absolute bottom-0 -left-28 w-44 rotate-12 skjul-ved-print" />

      <header className="mb-8 skjul-ved-print">
        <Link prefetch={true} href="/planer" className="text-sm text-ink-soft hover:text-terra">← Planer</Link>

        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="mt-1 font-display text-5xl">{data.plan.name}</h1>

          {!data.plan.arkivert && (
            <form action={arkiverPlan.bind(null, planId)}>
              <button
                type="submit"
                title="Planen legges bort — den kan alltid hentes frem igjen fra arkivet"
                className="text-sm text-ink-soft underline underline-offset-2 hover:text-terra"
              >
                Legg planen i arkivet
              </button>
            </form>
          )}
        </div>

        {data.plan.arkivert && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-2.5 text-sm">
            <span className="text-ink-soft">Planen ligger i arkivet.</span>
            <form action={gjenåpnePlan.bind(null, planId)}>
              <button type="submit" className="underline underline-offset-2 hover:text-terra">Hent den frem igjen</button>
            </form>
          </div>
        )}

        {(data.plan.dato || data.plan.personer || data.plan.merke) && (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 font-display italic text-lg text-ink-soft">
            {data.plan.dato && <span>{formaterDag(data.plan.dato)}</span>}
            {data.plan.personer && <span>· for {data.plan.personer} personer</span>}
            {data.plan.merke && (
              <span className="rounded-full border border-sage/50 bg-sage/10 px-2.5 py-0.5 font-tekst text-xs not-italic">{data.plan.merke}</span>
            )}
          </p>
        )}

        <div aria-hidden className="mt-4 border-b-4 border-double border-ink/25" />
      </header>

      {/* Etterordet: når dagen er passert, spør vi pent — og det som er skrevet vises som en
          håndskrevet lapp. Helt frivillig; planen blir liggende uansett. */}
      {erTidligere && !harEtterord && (
        <section aria-label="Hvordan gikk det?" className="mb-10 rounded-xl border-2 border-dashed border-butter bg-butter/10 p-4 skjul-ved-print">
          <h2 className="font-display text-2xl">Hvordan gikk det?</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Skriv et lite etterord, så husker neste års plan hva dere lærte. Helt frivillig — planen blir liggende her uansett.
          </p>

          <form action={evaluerPlan.bind(null, planId)} className="mt-3 flex flex-col gap-3">
            <label className="block text-sm">
              <span className="text-ink-soft">
                {data.plan.personer ? `Dere planla for ${data.plan.personer} — hvor mange kom?` : 'Hvor mange kom?'}
              </span>
              <input
                type="number"
                name="kom"
                min={0}
                max={10000}
                className="mt-1 block w-28 rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
              />
            </label>

            <label className="block text-sm">
              <span className="text-ink-soft">Hva ble for mye, hva ble for lite — noe å huske til neste gang?</span>
              <textarea
                name="dagbok"
                maxLength={2000}
                rows={3}
                placeholder="Litt for lite mat — og alt for mange salater …"
                className="mt-1 block w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 font-skrift text-lg focus:border-terra focus:outline-none"
              />
            </label>

            <button type="submit" className="self-start rounded-full bg-terra px-4 py-2 text-sm font-medium text-paper hover:bg-terra-deep">
              Skriv etterordet
            </button>
          </form>
        </section>
      )}

      {harEtterord && (
        <section aria-labelledby="etterord" className="mb-10">
          <h2 id="etterord" className="mb-3 font-display text-2xl">Etterord</h2>

          {data.plan.kom !== null && (
            <p className="mb-3 text-sm text-ink-soft">
              {data.plan.kom} kom{data.plan.personer ? ` — det var planlagt for ${data.plan.personer}` : ''}.
            </p>
          )}

          {data.plan.dagbok && (
            <div className="notatlapp max-w-xl px-5 pb-7 pt-[22px] drop-shadow-md">
              <p className="font-skrift text-xl leading-6 break-words">{data.plan.dagbok}</p>
            </div>
          )}

          <LukkbarDetails className="mt-3 text-sm text-ink-soft skjul-ved-print">
            <summary className="cursor-pointer list-none underline underline-offset-2 hover:text-terra">✎ rett på etterordet</summary>
            <form action={evaluerPlan.bind(null, planId)} className="mt-2 flex max-w-xl flex-col gap-2">
              <input
                type="number"
                name="kom"
                min={0}
                max={10000}
                defaultValue={data.plan.kom ?? undefined}
                aria-label="Hvor mange kom"
                className="w-28 rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
              />
              <textarea
                name="dagbok"
                maxLength={2000}
                rows={3}
                defaultValue={data.plan.dagbok ?? undefined}
                aria-label="Dagbok"
                className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 font-skrift text-lg focus:border-terra focus:outline-none"
              />
              <button type="submit" className="self-start rounded-full border border-line px-4 py-1.5 hover:border-terra hover:text-terra">
                Lagre
              </button>
            </form>
          </LukkbarDetails>
        </section>
      )}

      <section aria-label="Oppskriftene i planen" className="skjul-ved-print">
        {synlige.length === 0 ? (
          <p className="text-ink-soft">
            Ingen oppskrifter ennå — gå inn på en oppskrift og velg «Til plan …», så samles den her.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {synlige.map((rad) => (
              <li key={rad.recipeId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <Link prefetch={true}
                  href={`${uuidHref`/kokebok/${rad.cookbookId}/oppskrift/${rad.recipeId}`}?tilbake=${tilbake}${rad.ganger !== 1 ? `&ganger=${rad.ganger}` : ''}`}
                  className="font-display text-xl hover:text-terra"
                >
                  {rad.title}
                </Link>

                <span className="flex items-center gap-2">
                  {/* størrelsen kan endres her — handlelisten følger med */}
                  {rad.parsed.success && rad.parsed.data.info.kanSkaleres ? (
                    <form action={settPlanGanger.bind(null, planId, rad.recipeId)} className="flex items-center gap-0.5 skjul-ved-print" aria-label={`Størrelse på ${rad.title}`}>
                      {GANGER_VALG.map((valg) => (
                        <button
                          key={valg}
                          type="submit"
                          name="ganger"
                          value={valg}
                          aria-current={valg === rad.ganger ? 'true' : undefined}
                          className={`rounded-full px-2 py-0.5 text-sm ${valg === rad.ganger ? 'bg-terra font-medium text-paper' : 'text-ink-soft hover:text-terra'}`}
                        >
                          {valg === 0.5 ? '½' : valg}×
                        </button>
                      ))}
                    </form>
                  ) : (
                    rad.ganger !== 1 && (
                      <span className="rounded-full bg-terra px-2 py-0.5 text-sm font-medium text-paper">
                        {rad.ganger === 0.5 ? '½' : rad.ganger}×
                      </span>
                    )
                  )}

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
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* tradisjonen: fjorårets meny og mengder er ett klikk unna — det er sånn man blir bedre av årene */}
      {data.sammeMerke.length > 0 && (
        <section aria-labelledby="tidligere-aar" className="mt-10">
          <h2 id="tidligere-aar" className="mb-3 font-display text-2xl">Tidligere {data.plan.merke}</h2>

          <ul className="divide-y divide-line border-y border-line">
            {data.sammeMerke.map((forrige) => (
              <li key={forrige.id}>
                <Link prefetch={true}
                  href={uuidHref`/planer/${forrige.id}`}
                  className="group flex items-baseline justify-between gap-4 py-3 hover:text-terra"
                >
                  <span>
                    <span className="font-display text-lg">{forrige.name}</span>
                    <span className="block text-sm text-ink-soft">
                      {forrige.dato && `${formaterDag(forrige.dato)} · `}
                      {forrige.kom !== null
                        ? `${forrige.kom} kom${forrige.personer ? ` av ${forrige.personer} planlagt` : ''}`
                        : forrige.personer ? `for ${forrige.personer} personer` : ''}
                    </span>
                    {forrige.dagbok && (
                      <span className="block font-skrift text-lg text-ink-soft">
                        «{forrige.dagbok.length > 140 ? `${forrige.dagbok.slice(0, 140)}…` : forrige.dagbok}»
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="text-ink-soft group-hover:text-terra">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {/* bilder fra arrangementet — det ferdige kakebordet er halve gleden */}
      <section aria-labelledby="fra-bordet" className="mt-10">
        <h2 id="fra-bordet" className="mb-3 font-display text-3xl">Fra bordet</h2>

        {bilder.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {bilder.map((bilde, index) => (
              <figure key={bilde.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bilde.url}
                  alt={`${data.plan.name} — bilde ${index + 1}`}
                  className="h-40 w-full rounded object-cover shadow-bok"
                />
                <form action={slettPlanBilde.bind(null, bilde.id)} className="absolute top-1.5 right-1.5 skjul-ved-print">
                  <button
                    type="submit"
                    aria-label={`Fjern bilde ${index + 1}`}
                    title="Fjern bildet"
                    className="size-7 rounded-full bg-ink/50 text-paper hover:bg-ink"
                  >
                    ×
                  </button>
                </form>
              </figure>
            ))}
          </div>
        )}

        <form action={lastOppPlanBilde.bind(null, planId)} className="flex flex-wrap items-center gap-2 skjul-ved-print">
          <BildeInput
            name="bilde"
            ariaLabel="Bilde fra arrangementet"
            className="text-sm file:mr-3 file:rounded-full file:border file:border-line file:bg-paper file:px-4 file:py-1.5 file:text-sm hover:file:border-terra"
          />
          <button type="submit" className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-terra hover:text-terra">
            Legg til bilde — kakebordet, langbordet, kaoset
          </button>
        </form>
      </section>
    </main>
  );
}
