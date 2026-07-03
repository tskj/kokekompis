import Link from 'next/link';
import { and, asc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cookbook, recipes } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';

// Søket på tvers av hele hylla: ett felt som leter i tittel, beskrivelse OG ingrediensnavn.
// Flere ord snevrer inn (OG mellom ordene) — «eple kanel» finner oppskriftene som har begge,
// så feltet svarer også på «hva kan jeg lage med det jeg har?». Ren GET/URL-state, ingen klient-JS.

interface SokPageProps {
  searchParams: Promise<{ sok?: string }>;
}

// ILIKE-jokertegnene i brukerens søkeord skal være bokstavelige tegn, ikke jokere
function likeMønster(ord: string): string {
  return `%${ord.replace(/[\\%_]/g, '\\$&')}%`;
}

async function søk(userId: string, ord: string[]) {
  // hvert ord må treffe et sted i oppskriften — tittel, beskrivelse eller en ingrediens
  const vilkår: SQL[] = ord.map((o) => {
    const mønster = likeMønster(o);
    return sql`(
      ${recipes.title} ilike ${mønster}
      or coalesce(${recipes.description}, '') ilike ${mønster}
      or exists (
        select 1 from jsonb_array_elements(${recipes.content}->'ingredienser') as ing
        where ing->>'navn' ilike ${mønster}
      )
    )`;
  });

  // ingrediensene som traff vises på treffet — de er svaret når man søkte på det man har i skapet
  const ingrediensTreff = sql<string[] | null>`(
    select array_agg(distinct ing->>'navn')
    from jsonb_array_elements(${recipes.content}->'ingredienser') as ing
    where ${sql.join(ord.map((o) => sql`ing->>'navn' ilike ${likeMønster(o)}`), sql` or `)}
  )`;

  return db
    .select({
      id: recipes.id,
      title: recipes.title,
      description: recipes.description,
      bokId: cookbook.id,
      bokNavn: cookbook.name,
      ingredienser: ingrediensTreff,
    })
    .from(recipes)
    .innerJoin(cookbook, eq(recipes.cookbookId, cookbook.id))
    .where(and(
      eq(cookbook.userId, userId),
      isNull(cookbook.arkivert),
      isNull(recipes.utkastAv),
      // lagt bort etter prøving — skal ikke dukke opp som middagsforslag
      isNull(recipes.arkivert),
      ...vilkår,
    ))
    .orderBy(asc(cookbook.name), asc(recipes.title));
}

export default async function SokPage({ searchParams }: SokPageProps) {
  const { sok } = await searchParams;
  const userId = await getCurrentUserId();

  const ord = (sok ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 8);
  const treff = userId && ord.length > 0 ? await søk(userId, ord) : [];

  return (
    <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
      <header className="mb-8">
        <Link prefetch={true} href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>
        <h1 className="mt-1 font-display text-4xl">Søk i oppskriftene</h1>
        <p className="mt-2 text-ink-soft max-w-prose">
          Let etter navn eller ingredienser — «eple kanel» finner oppskriftene som bruker begge.
        </p>
      </header>

      <form action="/sok" className="mb-10 flex items-center gap-2">
        <input
          type="search"
          name="sok"
          defaultValue={sok ?? ''}
          placeholder="bolle … eller eple kanel"
          aria-label="Søk i oppskriftene"
          autoFocus
          className="w-full rounded-full border border-line bg-card px-5 py-2.5 focus:border-terra focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-terra px-5 py-2.5 text-sm font-medium text-paper hover:bg-terra-deep">
          Søk
        </button>
      </form>

      {!userId && <p className="text-ink-soft">Logg inn for å søke i dine egne oppskrifter.</p>}

      {userId && ord.length > 0 && treff.length === 0 && (
        <p className="text-ink-soft">
          Ingen treff på «{ord.join(' ')}» — prøv færre eller andre ord.
        </p>
      )}

      {treff.length > 0 && (
        <section aria-label="Treff">
          <p className="mb-3 text-sm text-ink-soft">
            {treff.length === 1 ? 'Ett treff' : `${treff.length} treff`}
          </p>

          <ul className="divide-y divide-line border-y border-line">
            {treff.map((oppskrift) => (
              <li key={oppskrift.id}>
                <Link prefetch={true}
                  href={uuidHref`/kokebok/${oppskrift.bokId}/oppskrift/${oppskrift.id}`}
                  className="group block py-3.5"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <span className="font-display text-xl group-hover:text-terra">{oppskrift.title}</span>
                    <span className="text-xs text-ink-soft">{oppskrift.bokNavn}</span>
                  </span>

                  {oppskrift.ingredienser && oppskrift.ingredienser.length > 0 && (
                    <span className="mt-0.5 block text-sm italic text-ink-soft">
                      med {oppskrift.ingredienser.join(', ')}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
