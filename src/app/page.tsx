import { auth, signIn, signOut } from '@/auth';
import { asc, eq, sql } from 'drizzle-orm';
import { cookbook, plans, recipeFavorites, users } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { nowDate } from '@/lib/clock';
import { formaterDag, erTidligereDag } from '@/lib/dato';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { opprettBok, settHylleSortering } from '@/app/actions/bok';
import { Kaffeflekk } from '@/components/Kaffeflekk';
import { SorterbarBokhylle } from '@/components/SorterbarBokhylle';
import Link from 'next/link';

function SignIn() {
  return (
    <form
      action={async () => {
        'use server';
        await signIn('google');
      }}
    >
      <button type="submit" className="text-sm underline underline-offset-2 text-ink-soft hover:text-terra">
        Logg inn med Google
      </button>
    </form>
  );
}

function SignOut() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut();
      }}
    >
      <button type="submit" className="text-sm underline underline-offset-2 text-ink-soft hover:text-terra">
        Logg ut
      </button>
    </form>
  );
}

// Hylla er personlig: innlogget ser du dine egne bøker — utlogget ser du utvalget av utstilte
// bøker (Marens utstillingsvindu). Favorittene danner sin egen "bok" med det første hjertet.
// Eieren velger selv om hylla står i egen rekkefølge eller etter sist åpnet.
async function getHylla(userId: string | null) {
  return withTransaction({ name: 'forside' }, async (tx) => {
    const sortering = userId
      ? (await tx
          .select({ hylleSortering: users.hylleSortering })
          .from(users)
          .where(eq(users.id, userId))
          .maybeSingle('forside.sortering'))?.hylleSortering ?? 'egen'
      : 'egen';

    const bøker = await tx
      .select({ id: cookbook.id, name: cookbook.name, farge: cookbook.farge })
      .from(cookbook)
      .where(userId ? eq(cookbook.userId, userId) : eq(cookbook.synlighet, 'utstilt'))
      .orderBy(...(
        !userId                     ? [asc(cookbook.name)]
        : sortering === 'sist-åpnet' ? [sql`${cookbook.sistÅpnet} desc nulls last`, asc(cookbook.name)]
        :                              [sql`${cookbook.rekkefølge} asc nulls last`, asc(cookbook.name)]
      ));

    const harFavoritter = userId
      ? await tx
          .select({ id: recipeFavorites.id })
          .from(recipeFavorites)
          .where(eq(recipeFavorites.userId, userId))
          .exists()
      : false;

    // planene ligger som lapper på skrivebordet under hylla — de nærmeste først
    const planer = userId
      ? await tx
          .select({ id: plans.id, name: plans.name, dato: plans.dato })
          .from(plans)
          .where(eq(plans.userId, userId))
          .orderBy(asc(plans.dato), asc(plans.name))
      : [];

    return { bøker, harFavoritter, planer, sortering };
  });
}

export default async function Home() {
  const session = await auth();

  const userId = await getCurrentUserId();
  const { bøker: cookbooks, harFavoritter, planer, sortering } = await getHylla(userId);

  // pilene for egen sortering vises bare når de kan utrette noe
  const kanSortere = !!userId && sortering === 'egen' && cookbooks.length > 1;

  // skrivebordet viser det som kommer — tidligere arrangementer bor under /planer
  const iDag = nowDate().toISOString().slice(0, 10);
  const kommendePlaner = planer.filter((plan) => !erTidligereDag(plan.dato, iDag));

  return (
    <main className="relative mx-auto max-w-4xl px-6 py-12">
      {/* dekor nederst/ytterst på siden — aldri over innholdet */}
      <Kaffeflekk className="absolute bottom-2 -left-32 w-52 rotate-12" />
      {/* flex-wrap: på smale skjermer faller hilsen + logg ut ned under tittelen i stedet for å
          presse siden bredere enn telefonen */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="font-display text-5xl md:text-6xl">Kokekompis</h1>
          <p className="mt-2 text-lg text-ink-soft italic font-display">
            Din levende kokebok — alltid ren i kantene, aldri ferdig skrevet.
          </p>
        </div>

        <div className="pb-2">
          {session?.user ? (
            <div className="flex items-center gap-3 text-sm text-ink-soft">
              <span>Hei, {session.user.name ?? 'du'}!</span>
              <SignOut />
            </div>
          ) : (
            <SignIn />
          )}
        </div>
      </header>

      <section className="relative mt-14" aria-label="Bokhylla">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">Bokhylla</h2>

          {userId && cookbooks.length > 1 && (
            <form action={settHylleSortering} className="flex items-center gap-2 text-xs text-ink-soft">
              <span>Sortert etter:</span>
              <button
                type="submit"
                name="sortering"
                value="egen"
                aria-pressed={sortering === 'egen'}
                className={sortering === 'egen' ? 'rounded-full bg-ink/10 px-2.5 py-0.5 font-medium' : 'underline underline-offset-2 hover:text-terra'}
              >
                min rekkefølge
              </button>
              <button
                type="submit"
                name="sortering"
                value="sist-åpnet"
                aria-pressed={sortering === 'sist-åpnet'}
                className={sortering === 'sist-åpnet' ? 'rounded-full bg-ink/10 px-2.5 py-0.5 font-medium' : 'underline underline-offset-2 hover:text-terra'}
              >
                sist åpnet
              </button>
            </form>
          )}
        </div>

        {/* På telefon ligger bøkene bortover med litt overlapp og scroller sidelengs — de brekker
            aldri under hverandre. På store skjermer brer hylla seg utover med luft mellom.
            I "min rekkefølge"-modus kan bøkene trykkes-og-dras på plass. */}
        <SorterbarBokhylle bøker={cookbooks} kanSortere={kanSortere} hale={
          <>
            {harFavoritter && (
              <Link
                href="/favoritter"
                className="group relative flex h-56 w-40 shrink-0 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/15 bg-butter p-4 text-ink shadow-bok transition-transform hover:-translate-y-2 -ml-8 first:ml-0 md:ml-0"
              >
                <span className="mt-5 block bg-paper/95 px-2 py-3 text-center font-display text-xl leading-snug shadow-sm">
                  ♥ Favoritter
                </span>
                <span className="text-center text-[10px] uppercase tracking-[0.25em] opacity-70">
                  Kokekompis
                </span>
              </Link>
            )}

            {userId && (
              <details className="group h-64 w-44 shrink-0 -ml-8 first:ml-0 md:ml-0">
                <summary className="flex h-full cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-r-md rounded-l-sm border-2 border-dashed border-line text-ink-soft hover:border-terra hover:text-terra group-open:hidden">
                  <span className="text-3xl leading-none">+</span>
                  <span className="font-display text-lg">ny bok</span>
                </summary>

                <form action={opprettBok} className="flex h-full flex-col justify-center gap-3 rounded-r-md rounded-l-sm border border-line bg-card p-4 shadow-bok">
                  <label className="block text-sm">
                    <span className="text-ink-soft">Hva skal boken hete?</span>
                    <input
                      name="navn"
                      required
                      maxLength={100}
                      placeholder="Mormors arvegods"
                      className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 font-display focus:border-terra focus:outline-none"
                    />
                  </label>
                  <button type="submit" className="rounded-full bg-terra px-4 py-2 text-sm font-medium text-paper hover:bg-terra-deep">
                    Sett på hylla
                  </button>
                </form>
              </details>
            )}
          </>
        } />

        {!userId && (
          cookbooks.length > 0 ? (
            <p className="mt-6 text-ink-soft">
              Et lite utvalg fra hylla — logg inn for å lage dine egne bøker.
            </p>
          ) : (
            <p className="mt-6 text-ink-soft">
              Hylla er tom ennå — logg inn for å sette den første boken på plass.
            </p>
          )
        )}
      </section>

      {/* Skrivebordet under hylla: planene ligger som håndskrevne lapper — det man SKAL lage,
          før det havner i en bok. Lappestilen sier hva en plan er bedre enn noen forklaring. */}
      {userId && (
        <section className="mt-16" aria-label="På planen">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-soft mb-1.5">På planen</h2>
          <p className="mb-5 text-sm text-ink-soft">
            17. mai-frokosten, julebaksten, bursdagen — samle det du skal lage, og få én handleliste for hele bordet.
          </p>

          <div className="flex flex-wrap items-stretch gap-5">
            {kommendePlaner.slice(0, 4).map((plan, index) => (
              <Link
                key={plan.id}
                href={uuidHref`/planer/${plan.id}`}
                className={`${['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'][index % 4]} notatlapp w-44 px-4 pb-6 pt-[18px] drop-shadow-md transition-transform hover:-translate-y-1`}
              >
                <span className="block font-skrift text-xl leading-6 break-words">{plan.name}</span>
                {plan.dato && <span className="block font-skrift text-lg leading-6 text-ink-soft">{formaterDag(plan.dato)}</span>}
              </Link>
            ))}

            {planer.length > kommendePlaner.slice(0, 4).length && (
              <Link href="/planer" className="self-center text-sm text-ink-soft underline underline-offset-2 hover:text-terra">
                alle planene →
              </Link>
            )}

            <Link
              href="/planer"
              className="flex min-h-24 w-44 flex-col items-center justify-center gap-1 border-2 border-dashed border-line text-ink-soft hover:border-terra hover:text-terra"
            >
              <span className="text-3xl leading-none">+</span>
              <span className="font-skrift text-xl">planlegg noe</span>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
