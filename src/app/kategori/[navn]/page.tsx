import Link from 'next/link';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookbook, recipes, recipeKategorier } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';

// Kategorisiden: alle oppskriftene med samme merke — samlet på tvers av bøkene. Kapitlene
// organiserer innad i én bok; her ser du alle suppene dine under ett, uansett hvor de bor.

interface KategoriSideProps {
  params: Promise<{ navn: string }>;
}

export default async function KategoriSide({ params }: KategoriSideProps) {
  const { navn: råNavn } = await params;
  const navn = decodeURIComponent(råNavn).trim().toLowerCase();
  if (!navn || navn.length > 40) notFound();

  const userId = await getCurrentUserId();
  if (!userId) notFound();

  const { treff, alleKategorier } = await withTransaction({ name: 'kategori.side' }, async (tx) => ({
    // merkede oppskrifter i bøker som står fremme — arkiverte (bok eller oppskrift) hviler
    treff: await tx
      .select({ id: recipes.id, title: recipes.title, description: recipes.description, bokId: cookbook.id, bokNavn: cookbook.name })
      .from(recipeKategorier)
      .innerJoin(recipes, eq(recipeKategorier.recipeId, recipes.id))
      .innerJoin(cookbook, eq(recipes.cookbookId, cookbook.id))
      .where(and(
        eq(recipeKategorier.userId, userId),
        eq(recipeKategorier.navn, navn),
        isNull(recipes.utkastAv),
        isNull(recipes.arkivert),
        isNull(cookbook.arkivert),
      ))
      .orderBy(asc(cookbook.name), asc(recipes.title)),

    // de andre merkene dine — så man kan hoppe mellom kategoriene
    alleKategorier: await tx
      .select({ navn: recipeKategorier.navn, antall: sql<number>`count(*)::int` })
      .from(recipeKategorier)
      .where(eq(recipeKategorier.userId, userId))
      .groupBy(recipeKategorier.navn)
      .orderBy(asc(recipeKategorier.navn)),
  }));

  return (
    <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
      <header className="mb-8">
        <Link prefetch={true} href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>
        <h1 className="mt-1 font-display text-4xl capitalize">{navn}</h1>
        <p className="mt-2 text-ink-soft max-w-prose">
          Alt du har merket med «{navn}» — samlet på tvers av bøkene.
        </p>
      </header>

      {alleKategorier.length > 1 && (
        <nav aria-label="Kategorier" className="mb-8 flex flex-wrap gap-2">
          {alleKategorier.map((kategori) => (
            <Link prefetch={true}
              key={kategori.navn}
              href={`/kategori/${encodeURIComponent(kategori.navn)}`}
              aria-current={kategori.navn === navn ? 'page' : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${
                kategori.navn === navn
                  ? 'border-terra bg-terra/10 text-terra'
                  : 'border-line bg-card text-ink-soft hover:border-terra hover:text-terra'
              }`}
            >
              {kategori.navn} <span className="opacity-70">({kategori.antall})</span>
            </Link>
          ))}
        </nav>
      )}

      {treff.length === 0 ? (
        <p className="text-ink-soft">
          Ingenting med dette merket ennå — sett det på en oppskrift med «+ kategori» i handlingsraden.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {treff.map((oppskrift) => (
            <li key={oppskrift.id}>
              {/* veien tilbake til kategorien følger med inn i oppskriften */}
              <Link prefetch={true}
                href={`${uuidHref`/kokebok/${oppskrift.bokId}/oppskrift/${oppskrift.id}`}?tilbake=${encodeURIComponent(`/kategori/${encodeURIComponent(navn)}`)}`}
                className="group block py-3.5"
              >
                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="font-display text-xl group-hover:text-terra">{oppskrift.title}</span>
                  <span className="text-xs text-ink-soft">{oppskrift.bokNavn}</span>
                </span>
                {oppskrift.description && (
                  <span className="mt-0.5 block text-sm text-ink-soft">{oppskrift.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
