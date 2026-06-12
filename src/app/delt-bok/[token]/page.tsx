import Link from 'next/link';
import { asc, eq, isNull, and, notInArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookbook, cookbookShares, chapters, recipes, recipeChapters, users } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { lesSkisse } from '@/lib/bok-utseende';
import { getUuidParam } from '@/lib/uuid/server-uuid-params';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { Skisse } from '@/components/skisser';
import { leggDeltBokPåHylla } from '@/app/actions/deling';

interface DeltBokSideProps {
  params: Promise<{ token: string }>;
}

// Den delte boken: vennen får lese hele innholdet — kapitler og oppskrifter — og kan legge en
// kopi av boken på sin egen hylle. Som oppskriftsdelingen: en stabil lenke, ingen SoMe.
export default async function DeltBokSide({ params }: DeltBokSideProps) {
  const token = getUuidParam(await params, 'token');

  const userId = await getCurrentUserId();
  const delt = await withTransaction({ name: 'bok.delt' }, async (tx) => {
    const share = await tx
      .select({ cookbookId: cookbookShares.cookbookId })
      .from(cookbookShares)
      .where(eq(cookbookShares.id, token))
      .maybeSingle('bok.delt.share');
    if (!share) return null;

    const bok = await tx
      .select({ name: cookbook.name, beskrivelse: cookbook.beskrivelse, skisse: cookbook.skisse, eierNavn: users.name })
      .from(cookbook)
      .innerJoin(users, eq(cookbook.userId, users.id))
      .where(eq(cookbook.id, share.cookbookId))
      .single('bok.delt.bok');

    const kapitler = await tx
      .select({ id: chapters.id, name: chapters.name })
      .from(chapters)
      .where(eq(chapters.cookbookId, share.cookbookId))
      .orderBy(asc(chapters.order));

    const koblinger = await tx
      .select({ chapterId: recipeChapters.chapterId, recipeId: recipes.id, title: recipes.title, description: recipes.description })
      .from(recipeChapters)
      .innerJoin(chapters, eq(recipeChapters.chapterId, chapters.id))
      .innerJoin(recipes, eq(recipeChapters.recipeId, recipes.id))
      .where(eq(chapters.cookbookId, share.cookbookId))
      .orderBy(asc(recipeChapters.order));

    const kategorisert = tx
      .select({ recipeId: recipeChapters.recipeId })
      .from(recipeChapters)
      .innerJoin(chapters, eq(recipeChapters.chapterId, chapters.id))
      .where(eq(chapters.cookbookId, share.cookbookId));

    const ukategorisert = await tx
      .select({ id: recipes.id, title: recipes.title, description: recipes.description })
      .from(recipes)
      .where(and(eq(recipes.cookbookId, share.cookbookId), isNull(recipes.utkastAv), notInArray(recipes.id, kategorisert)))
      .orderBy(asc(recipes.title));

    return { bok, kapitler, koblinger, ukategorisert };
  });
  if (!delt) notFound();

  const skisse = delt.bok.skisse ? lesSkisse(delt.bok.skisse) : null;
  const oppskriftHref = (id: string) => uuidHref`/delt-bok/${token}/oppskrift/${id}`;

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <header className="mb-8 flex items-baseline justify-between gap-4 border-b border-line pb-4">
        <p className="font-display italic text-lg text-ink-soft">
          {delt.bok.eierNavn ?? 'En venn'} deler en hel kokebok med deg
        </p>
        <Link href="/" className="text-sm text-ink-soft hover:text-terra">Kokekompis</Link>
      </header>

      <div className="mb-8 text-center">
        {skisse && <Skisse navn={skisse} className="mx-auto w-36" />}
        <h1 className="font-display text-5xl">{delt.bok.name}</h1>
        {delt.bok.beskrivelse && (
          <p className="mt-2 font-display italic text-lg text-ink-soft">{delt.bok.beskrivelse}</p>
        )}
      </div>

      {userId && (
        <form action={leggDeltBokPåHylla.bind(null, token)} className="mb-10 flex flex-wrap items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-card px-4 py-3">
          <span className="text-sm">Vil du ha hele boken?</span>
          <button type="submit" className="rounded-full bg-terra px-4 py-1.5 text-sm font-medium text-paper hover:bg-terra-deep">
            Legg den på din hylle
          </button>
          <span className="text-xs text-ink-soft">Kopien blir din egen, og er privat.</span>
        </form>
      )}

      <div className="flex flex-col gap-8">
        {delt.kapitler.map((kapittel) => {
          const oppskrifter = delt.koblinger.filter((kobling) => kobling.chapterId === kapittel.id);
          if (oppskrifter.length === 0) return null;

          return (
            <section key={kapittel.id} aria-label={kapittel.name}>
              <h2 className="mb-2 border-b border-line pb-1 font-display text-2xl">{kapittel.name}</h2>
              <ul>
                {oppskrifter.map((oppskrift) => (
                  <li key={oppskrift.recipeId}>
                    <Link href={oppskriftHref(oppskrift.recipeId)} className="group flex items-baseline justify-between gap-4 py-2 hover:text-terra">
                      <span>
                        {oppskrift.title}
                        {oppskrift.description && <span className="block text-sm text-ink-soft">{oppskrift.description}</span>}
                      </span>
                      <span aria-hidden className="text-ink-soft group-hover:text-terra">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {delt.ukategorisert.length > 0 && (
          <section aria-label="Ukategorisert">
            <h2 className="mb-2 border-b border-line pb-1 font-display text-2xl italic text-ink-soft">Ukategorisert</h2>
            <ul>
              {delt.ukategorisert.map((oppskrift) => (
                <li key={oppskrift.id}>
                  <Link href={oppskriftHref(oppskrift.id)} className="group flex items-baseline justify-between gap-4 py-2 hover:text-terra">
                    <span>
                      {oppskrift.title}
                      {oppskrift.description && <span className="block text-sm text-ink-soft">{oppskrift.description}</span>}
                    </span>
                    <span aria-hidden className="text-ink-soft group-hover:text-terra">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
