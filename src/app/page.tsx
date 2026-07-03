import { auth, signIn } from '@/auth';
import { and, asc, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cookbook, plans, recipeKategorier, users } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { nowDate } from '@/lib/clock';
import { formaterDag, erTidligereDag } from '@/lib/dato';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { opprettBok, settHylleSortering, gjenåpneBok, slettBok } from '@/app/actions/bok';
import { BekreftKnapp } from '@/components/BekreftKnapp';
import { flettHylle, type HylleElement } from '@/lib/hylle';
import { Kaffeflekk } from '@/components/Kaffeflekk';
import { SorterbarBokhylle } from '@/components/SorterbarBokhylle';
import Link from 'next/link';
import { LukkbarDetails } from '@/components/LukkbarDetails';

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

// Hylla er personlig: innlogget ser du dine egne bøker. En utlogget gjest har ingen hylle ennå
// (utstillingsvinduet er av enn så lenge) — bare Oppslagsboka og en invitasjon til å logge inn.
// Eieren velger selv om hylla står i egen rekkefølge eller etter sist åpnet.
async function getHylla(userId: string | null) {
  return withTransaction({ name: 'forside' }, async (tx) => {
    const bruker = userId
      ? await tx
          .select({ hylleSortering: users.hylleSortering, favoritterPlass: users.favoritterPlass, oppslagPlass: users.oppslagPlass })
          .from(users)
          .where(eq(users.id, userId))
          .maybeSingle('forside.bruker')
      : null;

    const sortering = bruker?.hylleSortering ?? 'egen';

    const bøker = userId
      ? await tx
          .select({ id: cookbook.id, name: cookbook.name, farge: cookbook.farge })
          .from(cookbook)
          .where(and(eq(cookbook.userId, userId), isNull(cookbook.arkivert)))
          .orderBy(...(
            sortering === 'sist-åpnet' ? [sql`${cookbook.sistÅpnet} desc nulls last`, asc(cookbook.name)]
            :                            [sql`${cookbook.rekkefølge} asc nulls last`, asc(cookbook.name)]
          ))
      : [];

    // bortlagte bøker — hentes frem eller slettes for godt fra arkivet under hylla
    const arkiverte = userId
      ? await tx
          .select({ id: cookbook.id, name: cookbook.name })
          .from(cookbook)
          .where(and(eq(cookbook.userId, userId), isNotNull(cookbook.arkivert)))
          .orderBy(asc(cookbook.name))
      : [];

    // planene ligger som lapper på skrivebordet under hylla — de nærmeste først, arkivet ligger bort
    const planer = userId
      ? await tx
          .select({ id: plans.id, name: plans.name, dato: plans.dato })
          .from(plans)
          .where(and(eq(plans.userId, userId), isNull(plans.arkivert)))
          .orderBy(asc(plans.dato), asc(plans.name))
      : [];

    // kategoriene — merkene som samler oppskrifter på tvers av bøkene («suppe», «pai») —
    // med antall, til stripen under hylla
    const kategorier = userId
      ? await tx
          .select({ navn: recipeKategorier.navn, antall: sql<number>`count(*)::int` })
          .from(recipeKategorier)
          .where(eq(recipeKategorier.userId, userId))
          .groupBy(recipeKategorier.navn)
          .orderBy(asc(recipeKategorier.navn))
      : [];

    // hylla flettes med favoritt-boka og oppslagsboka på plassene sine — i "sist åpnet"-modus
    // står de bakerst som før. En gjest møter eksempelboka og Oppslagsboka.
    const hylle: HylleElement[] = userId
      ? (sortering === 'egen'
          ? flettHylle(bøker, bruker?.favoritterPlass ?? null, bruker?.oppslagPlass ?? null)
          : flettHylle(bøker, null, null))
      : [{ slag: 'eksempel', id: 'eksempel' }, { slag: 'oppslag', id: 'oppslag' }];

    return { hylle, antallBøker: bøker.length, arkiverte, planer, kategorier, sortering };
  });
}

export default async function Home() {
  const session = await auth();

  const userId = await getCurrentUserId();

  // førstegangsopplevelsen: hylla skal aldri møte deg tom — en bok står klar til å fylles
  if (userId) {
    const harBok = await db
      .select({ id: cookbook.id })
      .from(cookbook)
      .where(eq(cookbook.userId, userId))
      .exists();
    if (!harBok) await db.insert(cookbook).values({ userId, name: 'Min første kokebok' });
  }

  const { hylle, antallBøker, arkiverte, planer, kategorier, sortering } = await getHylla(userId);

  // sortering gir bare mening i egen rekkefølge — og med mer enn ett element å flytte på
  const kanSortere = !!userId && sortering === 'egen' && hylle.length > 1;

  // skrivebordet viser det som kommer — tidligere arrangementer bor under /planer
  const iDag = nowDate().toISOString().slice(0, 10);
  const kommendePlaner = planer.filter((plan) => !erTidligereDag(plan.dato, iDag));

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
      {/* dekor i kantene — søl nede til venstre, og én stor delvis utenfor høyre kant */}
      <Kaffeflekk className="absolute bottom-2 -left-32 w-52 rotate-12" />
      <Kaffeflekk className="absolute -top-16 -right-24 w-60 rotate-[150deg]" />
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
          {userId ? (
            <div className="flex items-center gap-3 text-sm text-ink-soft">
              <span>Hei, {session?.user?.name ?? 'du'}!</span>
              <Link prefetch={true} href="/innstillinger" className="underline underline-offset-2 hover:text-terra">
                Innstillinger
              </Link>
            </div>
          ) : (
            <SignIn />
          )}
        </div>
      </header>

      {/* søket går på tvers av alle bøkene — navn og ingredienser i ett felt (/sok) */}
      {userId && (
        <form action="/sok" className="mt-10 flex items-center gap-2">
          <input
            type="search"
            name="sok"
            placeholder="Søk i alle oppskriftene — navn eller ingredienser …"
            aria-label="Søk i oppskriftene"
            className="w-full max-w-md rounded-full border border-line bg-card px-5 py-2 text-sm focus:border-terra focus:outline-none"
          />
          <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft hover:border-terra hover:text-terra">
            Søk
          </button>
        </form>
      )}

      <section className="relative mt-10" aria-label="Bokhylla">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">Bokhylla</h2>

          {userId && antallBøker > 1 && (
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
            I "min rekkefølge"-modus kan alt på hylla trykkes-og-dras på plass — også
            favoritt-boka og oppslagsboka. */}
        <SorterbarBokhylle elementer={hylle} kanSortere={kanSortere} hale={userId ? (
          <LukkbarDetails className="group block h-64 w-44">
            <summary className="flex h-full cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-r-md rounded-l-sm border-2 border-dashed border-line text-ink-soft hover:border-terra hover:text-terra group-open:hidden">
              <span className="text-3xl leading-none">+</span>
              <span className="font-display text-lg">ny bok</span>
            </summary>

            <form action={opprettBok} className="flex h-full flex-col justify-center gap-3 rounded-r-md rounded-l-sm border border-line bg-card p-4 shadow-bok">
              <label className="block text-sm">
                <span className="text-ink-soft">Hva skal boken hete? (kan stå tomt)</span>
                <input
                  name="navn"
                  maxLength={100}
                  placeholder="Mormors arvegods"
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 font-display focus:border-terra focus:outline-none"
                />
              </label>
              <button type="submit" className="rounded-full bg-terra px-4 py-2 text-sm font-medium text-paper hover:bg-terra-deep">
                Sett på hylla
              </button>
            </form>
          </LukkbarDetails>
        ) : undefined} />

        {arkiverte.length > 0 && (
          <details className="mt-5 text-sm text-ink-soft">
            <summary className="cursor-pointer list-none underline underline-offset-2 hover:text-terra">
              Arkivet ({arkiverte.length})
            </summary>

            <ul className="mt-2 divide-y divide-line border-y border-line">
              {arkiverte.map((bok) => (
                <li key={bok.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                  <span className="font-display text-lg text-ink">{bok.name}</span>

                  <span className="flex items-center gap-3">
                    <form action={gjenåpneBok.bind(null, bok.id)}>
                      <button type="submit" className="underline underline-offset-2 hover:text-terra">sett tilbake på hylla</button>
                    </form>
                    <form action={slettBok.bind(null, bok.id)}>
                      <BekreftKnapp
                        spørsmål={`Slette «${bok.name}» for godt? Det kan ikke angres — alle oppskriftene, kapitlene og bildene følger med.`}
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

        {!userId && (
          <p className="mt-6 text-ink-soft">
            Logg inn for å sette den første boken på plass — eller bla i «Min første kokebok» og
            Oppslagsboka så lenge.
          </p>
        )}
      </section>

      {/* Kategoriene — merkene som samler på tvers av bøkene: alle suppene under ett, uansett
          hvilken bok de bor i. Merkene settes på oppskriftssiden («+ kategori»). */}
      {kategorier.length > 0 && (
        <section className="mt-14" aria-label="Kategorier">
          <h2 className="mb-1.5 text-[11px] uppercase tracking-[0.2em] text-ink-soft">Kategorier</h2>
          <p className="mb-4 text-sm text-ink-soft">
            Merkene dine på tvers av bøkene — alle suppene under ett, uansett hvor de bor.
          </p>

          <div className="flex flex-wrap gap-2">
            {kategorier.map((kategori) => (
              <Link prefetch={true}
                key={kategori.navn}
                href={`/kategori/${encodeURIComponent(kategori.navn)}`}
                className="rounded-full border border-line bg-card px-3.5 py-1.5 text-sm hover:border-terra hover:text-terra"
              >
                {kategori.navn} <span className="text-ink-soft">({kategori.antall})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
              <Link prefetch={true}
                key={plan.id}
                href={uuidHref`/planer/${plan.id}`}
                className={`${['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'][index % 4]} notatlapp w-44 px-4 pb-6 pt-[18px] drop-shadow-md transition-transform hover:-translate-y-1`}
              >
                <span className="block font-skrift text-xl leading-6 break-words">{plan.name}</span>
                {plan.dato && <span className="block font-skrift text-lg leading-6 text-ink-soft">{formaterDag(plan.dato)}</span>}
              </Link>
            ))}

            {planer.length > kommendePlaner.slice(0, 4).length && (
              <Link prefetch={true} href="/planer" className="self-center text-sm text-ink-soft underline underline-offset-2 hover:text-terra">
                alle planene →
              </Link>
            )}

            <Link prefetch={true}
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
