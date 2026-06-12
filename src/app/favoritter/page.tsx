import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recipes, recipeFavorites } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';

// Favoritt-boken: alle hjertemerkede oppskrifter samlet, på tvers av kapitler — kimen til
// "min beste-av-bok" som en dag kan trykkes.
export default async function FavoritterSide() {
  const userId = await getCurrentUserId();

  const favoritter = userId
    ? await db
        .select({
          id: recipes.id,
          cookbookId: recipes.cookbookId,
          title: recipes.title,
          description: recipes.description,
        })
        .from(recipeFavorites)
        .innerJoin(recipes, eq(recipeFavorites.recipeId, recipes.id))
        .where(eq(recipeFavorites.userId, userId))
        .orderBy(asc(recipes.title))
    : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <Link prefetch={true} href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>
        <h1 className="mt-1 font-display text-5xl">♥ Favoritter</h1>
        <p className="mt-2 font-display italic text-lg text-ink-soft">
          De du lager igjen og igjen — din egen beste-av-bok.
        </p>
      </header>

      {favoritter.length === 0 ? (
        <p className="text-ink-soft">
          Ingen favoritter ennå — trykk på hjertet på en oppskrift, så samles de her.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {favoritter.map((favoritt) => (
            <li key={favoritt.id}>
              <Link prefetch={true}
                href={`${uuidHref`/kokebok/${favoritt.cookbookId}/oppskrift/${favoritt.id}`}?tilbake=${encodeURIComponent('/favoritter')}`}
                className="group flex items-baseline justify-between gap-4 py-4 hover:text-terra"
              >
                <span>
                  <span className="font-display text-2xl">{favoritt.title}</span>
                  {favoritt.description && (
                    <span className="block text-sm text-ink-soft">{favoritt.description}</span>
                  )}
                </span>
                <span aria-hidden className="text-ink-soft group-hover:text-terra">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
