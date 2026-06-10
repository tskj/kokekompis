import { withTransaction } from '@/lib/db-tx';
import { cookbook, chapters, recipes, recipeChapters, userOpenChapters } from '@/lib/db/schema';
import { eq, asc, inArray, notInArray, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { ChapterList } from './components/ChapterList';
import { getCookbookIdParam } from '@/lib/uuid/server-uuid-params';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { endreBokNavn, nyttKapittel } from '@/app/actions/bok';

interface CookbookLayoutProps {
  recipe: React.ReactNode;
  params: Promise<{ id: string }>;
}

async function getCookbookWithChapters(id: string, userId?: string) {
  // All reads run in one SERIALIZABLE transaction (src/lib/db-tx.ts) so the cookbook, its chapters,
  // the recipe↔chapter links, and the user's open-chapter set come from a single consistent snapshot.
  return withTransaction({ name: 'cookbook.layout' }, async (tx) => {
    // Get cookbook info
    const cookbookData = await tx
      .select({
        id: cookbook.id,
        name: cookbook.name,
        userId: cookbook.userId,
      })
      .from(cookbook)
      .where(eq(cookbook.id, id))
      .maybeSingle('cookbook.layout');

    if (!cookbookData) {
      return null;
    }

    // Get all chapters for this cookbook
    const chaptersData = await tx
      .select()
      .from(chapters)
      .where(eq(chapters.cookbookId, id))
      .orderBy(asc(chapters.order));

    // Get all recipe-chapter relationships for this cookbook
    const recipeChapterData = await tx
      .select({
        chapterId: recipeChapters.chapterId,
        recipeId: recipeChapters.recipeId,
        order: recipeChapters.order,
        recipeTitle: recipes.title,
        recipeDescription: recipes.description,
      })
      .from(recipeChapters)
      .innerJoin(chapters, eq(recipeChapters.chapterId, chapters.id))
      .innerJoin(recipes, eq(recipeChapters.recipeId, recipes.id))
      .where(eq(chapters.cookbookId, id))
      .orderBy(asc(recipeChapters.order));

    // Bokens oppskrifter uten kapittel — egen "Ukategorisert"-seksjon i innholdslista.
    const kategorisert = tx
      .select({ recipeId: recipeChapters.recipeId })
      .from(recipeChapters)
      .innerJoin(chapters, eq(recipeChapters.chapterId, chapters.id))
      .where(eq(chapters.cookbookId, id));

    const ukategorisert = await tx
      .select({ id: recipes.id, title: recipes.title, description: recipes.description })
      .from(recipes)
      .where(and(eq(recipes.cookbookId, id), notInArray(recipes.id, kategorisert)))
      .orderBy(asc(recipes.title));

    // Get user's open chapters for this cookbook using subquery
    let openChapterIds: string[] = [];
    if (userId) {
      const chaptersInCookbook = tx
        .select({ id: chapters.id })
        .from(chapters)
        .where(eq(chapters.cookbookId, id));

      const openChapters = await tx
        .select({ chapterId: userOpenChapters.chapterId })
        .from(userOpenChapters)
        .where(
          and(
            eq(userOpenChapters.userId, userId),
            inArray(userOpenChapters.chapterId, chaptersInCookbook)
          )
        );

      openChapterIds = openChapters.map(oc => oc.chapterId);
    }

    // Combine the data
    const chaptersWithRecipes = chaptersData.map((chapter) => ({
      ...chapter,
      recipes: recipeChapterData
        .filter((rc) => rc.chapterId === chapter.id)
        .map((rc) => ({
          id: rc.recipeId,
          title: rc.recipeTitle,
          description: rc.recipeDescription,
          order: rc.order,
        })),
    }));

    return {
      ...cookbookData,
      chapters: chaptersWithRecipes,
      ukategorisert,
      openChapterIds,
    };
  });
}

export default async function CookbookLayout({ recipe, params }: CookbookLayoutProps) {
  const cookbookId = await getCookbookIdParam(params);

  const session = await auth();
  const cookbookData = await getCookbookWithChapters(cookbookId, session?.user?.id);
  if (!cookbookData) notFound();

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10">
      <header className="mb-8 skjul-ved-print">
        <Link href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>

        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="font-display text-4xl">{cookbookData.name}</h1>

          <details className="group">
            <summary
              className="cursor-pointer list-none text-sm text-ink-soft opacity-60 hover:text-terra hover:opacity-100 group-open:hidden"
              title="Endre navn på boken"
              aria-label="Endre navn på boken"
            >
              ✎
            </summary>
            <form action={endreBokNavn.bind(null, cookbookId)} className="flex items-center gap-2">
              <input
                name="navn"
                required
                maxLength={100}
                defaultValue={cookbookData.name}
                aria-label="Nytt navn på boken"
                className="rounded-lg border border-line bg-card px-3 py-1.5 font-display text-lg focus:border-terra focus:outline-none"
              />
              <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-terra hover:text-terra">
                Døp om
              </button>
            </form>
          </details>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
        {/* Innholdslista — bokens venstreside */}
        <div className="lg:col-span-1 skjul-ved-print">
          <div className="sticky top-6">
            <h2 className="mb-3 text-[11px] uppercase tracking-[0.2em] text-ink-soft">Innhold</h2>

            {cookbookData.chapters.length === 0 ? (
              <p className="text-ink-soft">Ingen kapitler ennå</p>
            ) : (
              <ChapterList
                cookbookId={cookbookId}
                chapters={cookbookData.chapters}
                ukategorisert={cookbookData.ukategorisert}
                openChapterIds={cookbookData.openChapterIds}
              />
            )}

            <details className="mt-4">
              <summary className="cursor-pointer list-none py-1 text-sm text-ink-soft hover:text-terra">
                + nytt kapittel
              </summary>
              <form action={nyttKapittel.bind(null, cookbookId)} className="mt-1 flex items-center gap-2">
                <input
                  name="navn"
                  required
                  maxLength={100}
                  placeholder="Gjærbakst"
                  aria-label="Kapittelnavn"
                  className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-sm focus:border-terra focus:outline-none"
                />
                <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-terra hover:text-terra">
                  Lag
                </button>
              </form>
            </details>

            <Link
              href={uuidHref`/kokebok/${cookbookId}/importer`}
              className="mt-4 block border-2 border-dashed border-line px-3 py-2.5 text-center text-sm text-ink-soft hover:border-terra hover:text-terra"
            >
              + Ny oppskrift — skann eller lim inn lenke
            </Link>
          </div>
        </div>

        {/* Oppskriften — bokens høyreside */}
        <div className="lg:col-span-3">
          {recipe}
        </div>
      </div>
    </div>
  );
}
