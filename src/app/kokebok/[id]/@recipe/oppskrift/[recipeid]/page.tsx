import Link from 'next/link';
import { eq, and, asc, ne, inArray, notInArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookbook, recipes, recipeChapters, chapters, recipeNotes, recipeLinks, recipeFavorites, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { kanSeBok } from '@/lib/bok-tilgang';
import { openChapter } from '@/app/kokebok/[id]/actions';
import { getCookbookAndRecipeIdParams } from '@/lib/uuid/server-uuid-params';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { Oppskrift, lesGanger } from '@/components/oppskrift/Oppskrift';
import { NotatTavle } from '@/components/oppskrift/NotatTavle';
import { RettBilder } from '@/components/oppskrift/RettBilder';
import { Relasjoner } from '@/app/kokebok/[id]/components/Relasjoner';
import { bildeUrl } from '@/lib/lagring';
import { PrintKnapp } from '@/components/PrintKnapp';
import { LukkbarDetails } from '@/components/LukkbarDetails';
import { delOppskrift } from '@/app/actions/deling';
import { toggleFavoritt } from '@/app/actions/favoritter';
import { flyttOppskrift } from '@/app/actions/organisering';

interface RecipePageProps {
  params: Promise<{ id: string; recipeid: string }>;
  searchParams: Promise<{ enheter?: string; tilbake?: string; ganger?: string }>;
}

// Alt siden trenger, fra ett konsistent snapshot: oppskriften (eid av boken via cookbookId —
// kapittel er valgfri kategorisering), lapper, lenker begge veier, favorittstatus, og bokens
// kapitler/oppskrifter til flytt- og lenk-skjemaene.
async function getOppskriftSide(recipeId: string, cookbookId: string, userId: string | null) {
  return withTransaction({ name: 'oppskrift.side' }, async (tx) => {
    // boken styrer tilgangen: privat = bare eieren, utstilt = alle får lese
    const bok = await tx
      .select({ userId: cookbook.userId, synlighet: cookbook.synlighet })
      .from(cookbook)
      .where(eq(cookbook.id, cookbookId))
      .maybeSingle('oppskrift.side.bok');
    if (!bok || !kanSeBok(bok, userId)) return null;

    const oppskrift = await tx
      .select({
        id: recipes.id,
        title: recipes.title,
        description: recipes.description,
        content: recipes.content,
      })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.cookbookId, cookbookId)))
      .maybeSingle('oppskrift.side');
    if (!oppskrift) return null;

    const kapitlerIBoken = await tx
      .select({ id: chapters.id, name: chapters.name })
      .from(chapters)
      .where(eq(chapters.cookbookId, cookbookId))
      .orderBy(asc(chapters.order));

    // En oppskrift kan stå i flere kapitler — et bevisst velg-én-av-mange for åpne/aktiv-markering.
    const kapittelLenke = await tx
      .select({ chapterId: recipeChapters.chapterId })
      .from(recipeChapters)
      .where(and(
        eq(recipeChapters.recipeId, recipeId),
        inArray(recipeChapters.chapterId, kapitlerIBoken.map((k) => k.id)),
      ))
      .orderBy(asc(recipeChapters.chapterId))
      .maybeFirst('oppskrift.side.kapittel');

    const notater = userId
      ? await tx
          .select({ id: recipeNotes.id, tekst: recipeNotes.tekst, farge: recipeNotes.farge })
          .from(recipeNotes)
          .where(and(eq(recipeNotes.recipeId, recipeId), eq(recipeNotes.userId, userId)))
          .orderBy(asc(recipeNotes.createdAt))
      : [];

    const utgående = await tx
      .select({ linkId: recipeLinks.id, recipeId: recipeLinks.toRecipeId, tittel: recipes.title })
      .from(recipeLinks)
      .innerJoin(recipes, eq(recipeLinks.toRecipeId, recipes.id))
      .where(eq(recipeLinks.fromRecipeId, recipeId));

    const innkommende = await tx
      .select({ linkId: recipeLinks.id, recipeId: recipeLinks.fromRecipeId, tittel: recipes.title })
      .from(recipeLinks)
      .innerJoin(recipes, eq(recipeLinks.fromRecipeId, recipes.id))
      .where(eq(recipeLinks.toRecipeId, recipeId));

    const alleredeLenket = utgående.map((l) => l.recipeId);
    const kandidater = await tx
      .select({ id: recipes.id, tittel: recipes.title })
      .from(recipes)
      .where(and(
        eq(recipes.cookbookId, cookbookId),
        ne(recipes.id, recipeId),
        ...(alleredeLenket.length > 0 ? [notInArray(recipes.id, alleredeLenket)] : []),
      ))
      .orderBy(asc(recipes.title));

    const erFavoritt = userId
      ? await tx
          .select({ id: recipeFavorites.id })
          .from(recipeFavorites)
          .where(and(eq(recipeFavorites.userId, userId), eq(recipeFavorites.recipeId, recipeId)))
          .exists()
      : false;

    return { ...oppskrift, erEier: bok.userId === userId, kapitlerIBoken, kapittelId: kapittelLenke?.chapterId ?? null, notater, utgående, innkommende, kandidater, erFavoritt };
  });
}

export default async function RecipePage({ params, searchParams }: RecipePageProps) {
  const { cookbookId, recipeId } = await getCookbookAndRecipeIdParams(params);
  const { enheter, tilbake, ganger: gangerParam } = await searchParams;

  const userId = await getCurrentUserId();
  const side = await getOppskriftSide(recipeId, cookbookId, userId);
  if (!side) notFound();

  if (side.kapittelId) await openChapter(side.kapittelId);

  const content = recipeContentSchema.parse(side.content);
  const ganger = lesGanger(gangerParam, content.info.kanSkaleres);
  const bilder = await Promise.all(content.ferdigprodukt.bilder.map(async (key) => ({ key, url: await bildeUrl(key) })));

  const stiBase = uuidHref`/kokebok/${cookbookId}/oppskrift/${recipeId}`;
  const tilbakeSti = tilbake && tilbake.startsWith('/') ? tilbake : null;

  return (
    <>
      {tilbakeSti && (
        <p className="mb-4 skjul-ved-print">
          <Link
            href={tilbakeSti}
            className="inline-block rounded-full bg-butter/40 border border-butter px-4 py-1.5 text-sm hover:bg-butter/70"
          >
            ← Tilbake dit du var
          </Link>
        </p>
      )}

      <Oppskrift
        tittel={side.title}
        beskrivelse={side.description}
        content={content}
        visEnhet={enheter === 'gram' ? 'gram' : 'original'}
        ganger={ganger}
        stiBase={stiBase}
        ferdigBilder={<RettBilder tittel={side.title} bilder={bilder} recipeId={side.erEier ? recipeId : undefined} />}
        handlinger={
          <>
            <Link
              href={`${uuidHref`/bak/${recipeId}`}?fra=${encodeURIComponent(stiBase)}${ganger !== 1 ? `&ganger=${ganger}` : ''}`}
              className="rounded-full bg-terra px-5 py-2 text-sm font-medium text-paper hover:bg-terra-deep"
            >
              Sett i gang — bakeview →
            </Link>

            {userId && (
              <form action={toggleFavoritt.bind(null, recipeId)}>
                <button
                  type="submit"
                  aria-pressed={side.erFavoritt}
                  aria-label={side.erFavoritt ? 'Fjern fra favoritter' : 'Merk som favoritt'}
                  title={side.erFavoritt ? 'Fjern fra favoritter' : 'Merk som favoritt'}
                  className={`rounded-full border px-4 py-2 text-sm ${side.erFavoritt ? 'border-terra text-terra' : 'border-line hover:border-terra hover:text-terra'}`}
                >
                  {side.erFavoritt ? '♥ Favoritt' : '♡ Favoritt'}
                </button>
              </form>
            )}

            {side.erEier && (
              <form action={delOppskrift.bind(null, recipeId)}>
                <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra">
                  Del oppskriften
                </button>
              </form>
            )}

            {side.erEier && (
              <Link
                href={`${stiBase}/rediger`}
                className="rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra"
              >
                Rediger
              </Link>
            )}

            <PrintKnapp />

            {side.erEier && (
              <LukkbarDetails className="relative">
                <summary className="cursor-pointer list-none rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra">
                  Flytt …
                </summary>

                <form action={flyttOppskrift.bind(null, recipeId)} className="absolute z-10 mt-2 flex w-64 flex-col gap-2 rounded-xl border border-line bg-card p-3 shadow-bok">
                  <select name="kapittel" defaultValue={side.kapittelId ? encodeUuidToBase32(side.kapittelId) : 'ingen'} aria-label="Kapittel" className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm">
                    {side.kapitlerIBoken.map((kapittel) => (
                      <option key={kapittel.id} value={encodeUuidToBase32(kapittel.id)}>{kapittel.name}</option>
                    ))}
                    <option value="ingen">Ukategorisert</option>
                  </select>
                  <button type="submit" className="rounded-full bg-terra px-4 py-1.5 text-sm font-medium text-paper hover:bg-terra-deep">
                    Flytt
                  </button>
                </form>
              </LukkbarDetails>
            )}
          </>
        }
        relasjoner={
          (side.utgående.length > 0 || side.innkommende.length > 0 || (side.erEier && side.kandidater.length > 0)) ? (
            <Relasjoner
              cookbookId={cookbookId}
              recipeId={recipeId}
              stiBase={stiBase}
              utgående={side.utgående}
              innkommende={side.innkommende}
              kandidater={side.kandidater}
              kanRedigere={side.erEier}
            />
          ) : null
        }
        notater={userId ? <NotatTavle recipeId={recipeId} notater={side.notater} /> : null}
      />
    </>
  );
}
