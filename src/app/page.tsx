import { auth, signIn, signOut } from '@/auth';
import { asc, eq } from 'drizzle-orm';
import { cookbook, recipeFavorites } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { bokFargeKlasse } from '@/lib/bok-utseende';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { opprettBok } from '@/app/actions/bok';
import { Kaffeflekk } from '@/components/Kaffeflekk';
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
async function getHylla(userId: string | null) {
  return withTransaction({ name: 'forside' }, async (tx) => {
    const bøker = await tx
      .select({ id: cookbook.id, name: cookbook.name, farge: cookbook.farge })
      .from(cookbook)
      .where(userId ? eq(cookbook.userId, userId) : eq(cookbook.synlighet, 'utstilt'))
      .orderBy(asc(cookbook.name));

    const harFavoritter = userId
      ? await tx
          .select({ id: recipeFavorites.id })
          .from(recipeFavorites)
          .where(eq(recipeFavorites.userId, userId))
          .exists()
      : false;

    return { bøker, harFavoritter };
  });
}

export default async function Home() {
  const session = await auth();

  const userId = await getCurrentUserId();
  const { bøker: cookbooks, harFavoritter } = await getHylla(userId);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
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
        <Kaffeflekk className="absolute -top-12 right-2 w-28 rotate-12" />
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-soft mb-6">Bokhylla</h2>

        {/* På telefon ligger bøkene bortover med litt overlapp og scroller sidelengs — de brekker
            aldri under hverandre. På store skjermer brer hylla seg utover med luft mellom. */}
        <div className="flex items-end overflow-x-auto pt-3 border-b-8 border-ink/80 md:flex-wrap md:gap-6 md:overflow-visible">
            {cookbooks.map((bok, index) => (
              <Link
                key={bok.id}
                href={uuidHref`/kokebok/${bok.id}`}
                className={`${bokFargeKlasse(bok.farge, index)} group relative flex h-64 w-44 shrink-0 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/20 p-4 shadow-bok transition-transform hover:-translate-y-2 -ml-8 first:ml-0 md:ml-0`}
              >
                {/* opphøyde ryggbånd — de tverrgående ribbene på en gammel innbinding */}
                <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-2 border-t-2 border-current opacity-25" />
                <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-3.5 border-t border-current opacity-25" />
                <span aria-hidden className="pointer-events-none absolute inset-x-1.5 bottom-7 border-t border-current opacity-25" />
                <span aria-hidden className="pointer-events-none absolute inset-x-1.5 bottom-[2.125rem] border-t-2 border-current opacity-25" />

                <span className="mt-6 block bg-paper/95 px-2 py-3 text-center font-display text-xl leading-snug text-ink shadow-sm">
                  {bok.name}
                </span>
                <span className="text-center text-[10px] uppercase tracking-[0.25em] opacity-70">
                  Kokekompis
                </span>
              </Link>
            ))}

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
          </div>

        {userId && (
          <p className="mt-10">
            <Link
              href="/planer"
              className="inline-block border-2 border-dashed border-line px-4 py-3 text-sm text-ink-soft hover:border-terra hover:text-terra"
            >
              Planlegging → samle det du skal lage til 17. mai, julaften eller bursdagen — med én handleliste
            </Link>
          </p>
        )}

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
    </main>
  );
}
