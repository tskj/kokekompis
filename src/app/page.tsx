import { auth, signIn, signOut } from '@/auth';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cookbook, recipeFavorites } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';
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

// Bokryggene på hylla veksler mellom disse stofffargene.
const BOK_FARGER = [
  'bg-terra text-paper',
  'bg-sage text-paper',
  'bg-ink text-paper',
  'bg-butter text-ink',
];

async function getCookbooks() {
  return await db
    .select({
      id: cookbook.id,
      name: cookbook.name,
    })
    .from(cookbook);
}

export default async function Home() {
  const session = await auth();
  const cookbooks = await getCookbooks();

  // Favorittene danner sin egen "bok" på hylla — den dukker opp med det første hjertet.
  const userId = await getCurrentUserId();
  const harFavoritter = userId
    ? await db
        .select({ id: recipeFavorites.id })
        .from(recipeFavorites)
        .where(eq(recipeFavorites.userId, userId))
        .exists()
    : false;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl md:text-6xl">Kokekompis</h1>
          <p className="mt-2 text-lg text-ink-soft italic font-display">
            Din levende kokebok — alltid ren i kantene, aldri ferdig skrevet.
          </p>
        </div>

        <div className="shrink-0 pb-2">
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

      <section className="mt-14" aria-label="Bokhylla">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-soft mb-6">Bokhylla</h2>

        {cookbooks.length === 0 ? (
          <p className="text-ink-soft">
            Hylla er tom ennå — den første boken kommer når du gjør den til din.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-6 border-b-8 border-ink/80">
            {cookbooks.map((bok, index) => (
              <Link
                key={bok.id}
                href={uuidHref`/kokebok/${bok.id}`}
                className={`${BOK_FARGER[index % BOK_FARGER.length]} group relative flex h-64 w-44 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/20 p-4 shadow-bok transition-transform hover:-translate-y-2`}
              >
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
                className="group relative flex h-56 w-40 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/15 bg-butter p-4 text-ink shadow-bok transition-transform hover:-translate-y-2"
              >
                <span className="mt-5 block bg-paper/95 px-2 py-3 text-center font-display text-xl leading-snug shadow-sm">
                  ♥ Favoritter
                </span>
                <span className="text-center text-[10px] uppercase tracking-[0.25em] opacity-70">
                  Kokekompis
                </span>
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
