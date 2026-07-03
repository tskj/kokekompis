import Link from 'next/link';
import { asc, eq, inArray } from 'drizzle-orm';
import { withTransaction } from '@/lib/db-tx';
import { recipes, recipeFavorites, recipeChapters, chapters } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';

// Favoritt-boken: alle hjertemerkede oppskrifter samlet — og den oppfører seg som en vanlig
// bok: innholdsliste til venstre med oppskriftene under kapitlene sine (kapittelnavnet fra
// boken de bor i), og en forside strødd med hjerter der oppslaget ellers ville stått.
async function getFavoritter(userId: string) {
  return withTransaction({ name: 'favoritter' }, async (tx) => {
    const favoritter = await tx
      .select({
        id: recipes.id,
        cookbookId: recipes.cookbookId,
        title: recipes.title,
        description: recipes.description,
      })
      .from(recipeFavorites)
      .innerJoin(recipes, eq(recipeFavorites.recipeId, recipes.id))
      .where(eq(recipeFavorites.userId, userId))
      .orderBy(asc(recipes.title));

    const kapittelNavn = favoritter.length > 0
      ? await tx
          .select({ recipeId: recipeChapters.recipeId, navn: chapters.name })
          .from(recipeChapters)
          .innerJoin(chapters, eq(recipeChapters.chapterId, chapters.id))
          .where(inArray(recipeChapters.recipeId, favoritter.map((favoritt) => favoritt.id)))
      : [];

    return { favoritter, kapittelNavn };
  });
}

// forsiden: hjerter strødd som på et godt brukt omslag — i bokens egne farger
function Hjerteforside() {
  const hjerte = 'M0 6 C0 1 -4 -3 -8 -1 C-12 1 -11 7 0 15 C11 7 12 1 8 -1 C4 -3 0 1 0 6 z';

  return (
    <svg viewBox="0 0 240 160" aria-hidden className="mx-auto w-56 md:w-72">
      <path d={hjerte} fill="#b04e28" opacity="0.85" transform="translate(120 60) scale(4.4) rotate(-4)" />
      <path d={hjerte} fill="#722f37" opacity="0.7"  transform="translate(58 50)  scale(2.1) rotate(-16)" />
      <path d={hjerte} fill="#c97c5d" opacity="0.75" transform="translate(180 44) scale(1.7) rotate(12)" />
      <path d={hjerte} fill="#e9b949" opacity="0.7"  transform="translate(42 108) scale(1.4) rotate(10)" />
      <path d={hjerte} fill="#c23b2e" opacity="0.55" transform="translate(196 104) scale(1.2) rotate(-10)" />
      <path d={hjerte} fill="#722f37" opacity="0.45" transform="translate(150 124) scale(0.9) rotate(18)" />
      <path d={hjerte} fill="#c97c5d" opacity="0.5"  transform="translate(86 128)  scale(0.8) rotate(-22)" />
    </svg>
  );
}

export default async function FavoritterSide() {
  const userId = await getCurrentUserId();
  const { favoritter, kapittelNavn } = userId ? await getFavoritter(userId) : { favoritter: [], kapittelNavn: [] };

  // oppskriftene grupperes under kapitlene sine — Ukategorisert bakerst, som i bøkene
  const kapittelAv = new Map(kapittelNavn.map((rad) => [rad.recipeId, rad.navn]));
  const grupper = new Map<string, typeof favoritter>();
  for (const favoritt of favoritter) {
    const navn = kapittelAv.get(favoritt.id) ?? 'Ukategorisert';
    grupper.set(navn, [...(grupper.get(navn) ?? []), favoritt]);
  }

  const kapitler = [...grupper.keys()].sort((a, b) =>
    a === 'Ukategorisert' ?  1
    : b === 'Ukategorisert' ? -1
    :                         a.localeCompare(b, 'nb'));

  const oppskriftHref = (favoritt: { cookbookId: string; id: string }) =>
    `${uuidHref`/kokebok/${favoritt.cookbookId}/oppskrift/${favoritt.id}`}?tilbake=${encodeURIComponent('/favoritter')}`;

  return (
    <div className="relative mx-auto max-w-7xl p-4 sm:p-6 md:p-10">
      <header className="mb-8">
        <Link prefetch={true} href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>
        <h1 className="mt-1 font-display text-4xl">♥ Favoritter</h1>

        {/* dobbeltstrek under tittelfeltet — som i alle bøkene */}
        <div aria-hidden className="mt-4 border-b-4 border-double border-ink/25" />
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <h2 className="mb-3 text-[11px] uppercase tracking-[0.2em] text-ink-soft">Innhold</h2>

            {favoritter.length === 0 ? (
              <p className="text-ink-soft">
                Ingen favoritter ennå — trykk på hjertet på en oppskrift, så samles de her.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {kapitler.map((navn) => (
                  <details key={navn} className="group">
                    <summary className={`cursor-pointer list-none py-1 font-display text-lg hover:text-terra ${navn === 'Ukategorisert' ? 'italic text-ink-soft' : ''}`}>
                      <span aria-hidden className="mr-1 inline-block text-xs text-ink-soft transition-transform group-open:rotate-90">▸</span>
                      {navn}
                    </summary>
                    <ul className="ml-4 border-l border-line pl-3">
                      {(grupper.get(navn) ?? []).map((favoritt) => (
                        <li key={favoritt.id}>
                          <Link prefetch={true} href={oppskriftHref(favoritt)} className="group/lenke block py-1.5 hover:text-terra">
                            {favoritt.title}
                            {favoritt.description && (
                              <span className="block text-xs text-ink-soft">{favoritt.description}</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* forsiden — hjertene er omslaget, slik akvarellene er det i de andre bøkene */}
        <div className="lg:col-span-3">
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-10 text-center">
            <Hjerteforside />
            <p className="max-w-md font-display italic text-xl text-ink-soft">
              De du lager igjen og igjen — din egen beste-av-bok.
            </p>
            {favoritter.length > 0 && (
              <p className="text-sm text-ink-soft">Slå opp i innholdslista — hver oppskrift åpnes i boken sin.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
