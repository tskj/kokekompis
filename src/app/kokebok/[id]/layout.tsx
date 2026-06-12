import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-tx';
import { nowDate } from '@/lib/clock';
import { cookbook, chapters, recipes, recipeChapters, bokFarger } from '@/lib/db/schema';
import { eq, asc, notInArray, isNull, and, ne } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChapterList } from './components/ChapterList';
import { getCookbookIdParam } from '@/lib/uuid/server-uuid-params';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { getCurrentUserId } from '@/lib/current-user';
import { kanSeBok } from '@/lib/bok-tilgang';
import { BOK_FARGE_KLASSER, BOK_FARGE_VAR, BÅND_KLASSER, båndMønstre, lesBåndValg, skisseNavn } from '@/lib/bok-utseende';
import { bildeUrl } from '@/lib/lagring';
import { Kaffeflekk } from '@/components/Kaffeflekk';
import { Skisse } from '@/components/skisser';
import { BlaOm } from '@/components/BlaOm';
import { endreBokNavn, nyttKapittel, settBokSynlighet, settBokFarge, settBokBånd, lastOppBokBånd, settBokForside } from '@/app/actions/bok';

interface CookbookLayoutProps {
  recipe: React.ReactNode;
  params: Promise<{ id: string }>;
}

async function getCookbookWithChapters(id: string, userId?: string) {
  // All reads run in one SERIALIZABLE transaction (src/lib/db-tx.ts) so the cookbook, its chapters
  // and the recipe↔chapter links come from a single consistent snapshot.
  return withTransaction({ name: 'cookbook.layout' }, async (tx) => {
    // Get cookbook info
    const cookbookData = await tx
      .select({
        id: cookbook.id,
        name: cookbook.name,
        userId: cookbook.userId,
        synlighet: cookbook.synlighet,
        farge: cookbook.farge,
        headerBilde: cookbook.headerBilde,
        beskrivelse: cookbook.beskrivelse,
        skisse: cookbook.skisse,
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
    // Utkast hører til på originalens side, ikke i innholdslista.
    const kategorisert = tx
      .select({ recipeId: recipeChapters.recipeId })
      .from(recipeChapters)
      .innerJoin(chapters, eq(recipeChapters.chapterId, chapters.id))
      .where(eq(chapters.cookbookId, id));

    const ukategorisert = await tx
      .select({ id: recipes.id, title: recipes.title, description: recipes.description })
      .from(recipes)
      .where(and(eq(recipes.cookbookId, id), isNull(recipes.utkastAv), notInArray(recipes.id, kategorisert)))
      .orderBy(asc(recipes.title));

    // Dine andre bøker — målene kapittel-stellet kan flytte et helt kapittel til.
    const andreBøker = userId
      ? await tx
          .select({ id: cookbook.id, name: cookbook.name })
          .from(cookbook)
          .where(and(eq(cookbook.userId, userId), ne(cookbook.id, id)))
          .orderBy(asc(cookbook.name))
      : [];

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
      andreBøker,
    };
  });
}

export default async function CookbookLayout({ recipe, params }: CookbookLayoutProps) {
  const cookbookId = await getCookbookIdParam(params);

  const userId = await getCurrentUserId();
  const cookbookData = await getCookbookWithChapters(cookbookId, userId ?? undefined);
  if (!cookbookData || !kanSeBok(cookbookData, userId)) notFound();

  // Gjester (utstilt bok) får lese, aldri stelle: alt som endrer boken rendres kun for eieren.
  const erEier = cookbookData.userId === userId;

  // bokmerket for "sist åpnet"-sorteringen på hylla — å slå opp i boken ER å bruke den
  if (erEier) await db.update(cookbook).set({ sistÅpnet: nowDate() }).where(eq(cookbook.id, cookbookId));

  // Bokbåndet — den smale stripen mellom tittel og innhold: et mønster i en bokfarge, eller et
  // opplastet bilde (nøkler starter med bok/). Ukjente verdier viser ingenting fremfor å feile.
  const headerBilde = cookbookData.headerBilde;
  const båndValg = headerBilde ? lesBåndValg(headerBilde) : null;
  const bånd = båndValg                       ? { mønster: båndValg }
             : headerBilde?.startsWith('bok/') ? { bilde: await bildeUrl(headerBilde) }
             :                                   null;

  return (
    <div className="relative mx-auto max-w-7xl p-6 md:p-10">
      {/* dekor nederst/ytterst — aldri over innholdet (negative venstrekanter gir ikke scroll) */}
      <Kaffeflekk className="absolute bottom-0 -left-36 w-52 rotate-6 skjul-ved-print" />
      <header className="mb-8 skjul-ved-print">
        <Link href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>

        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="font-display text-4xl">{cookbookData.name}</h1>

          {erEier && (
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
          )}
        </div>

        {erEier && (
          <form action={settBokSynlighet.bind(null, cookbookId)} className="mt-1.5 flex items-center gap-2 text-xs text-ink-soft">
            <input
              type="hidden"
              name="synlighet"
              value={cookbookData.synlighet === 'utstilt' ? 'privat' : 'utstilt'}
            />
            <span>
              {cookbookData.synlighet === 'utstilt'
                ? 'Utstilt på forsiden — alle kan lese boken.'
                : 'Privat bok — bare du ser den.'}
            </span>
            <button type="submit" className="underline underline-offset-2 hover:text-terra">
              {cookbookData.synlighet === 'utstilt' ? 'Gjør den privat' : 'Still den ut'}
            </button>
          </form>
        )}

        {erEier && (
          <details className="mt-2.5 text-xs text-ink-soft">
            <summary
              className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm hover:border-terra hover:text-terra"
              title="Velg farge på ryggen og bånd under tittelen"
            >
              <span aria-hidden>🎨</span> Bokas utseende
            </summary>

            <div className="mt-2 flex max-w-md flex-col gap-4 rounded-lg border border-line bg-card p-3">
              {/* trykkene lagres i det de skjer — haken og ringen viser hva boken har nå */}
              <p className="italic">Alt her lagres i det du trykker — ✓ viser valget som gjelder.</p>

              <form action={settBokFarge.bind(null, cookbookId)} className="flex flex-wrap items-center gap-2">
                <span>Farge på ryggen:</span>
                {bokFarger.map((farge) => (
                  <button
                    key={farge}
                    type="submit"
                    name="farge"
                    value={farge}
                    title={farge}
                    aria-label={`Gi boken fargen ${farge}`}
                    aria-pressed={cookbookData.farge === farge}
                    className={`${BOK_FARGE_KLASSER[farge]} size-7 rounded-full border border-ink/20 text-sm leading-none ${cookbookData.farge === farge ? 'ring-2 ring-offset-1 ring-ink/70' : ''}`}
                  >
                    {cookbookData.farge === farge ? '✓' : ''}
                  </button>
                ))}
              </form>

              <form action={settBokBånd.bind(null, cookbookId)} className="flex flex-col gap-1.5">
                <span>Bånd under tittelen — hvert mønster i alle bokfargene:</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {båndMønstre.flatMap((mønster) =>
                    bokFarger.map((farge) => (
                      <button
                        key={`${mønster}:${farge}`}
                        type="submit"
                        name="valg"
                        value={`${mønster}:${farge}`}
                        title={`${mønster} i ${farge}`}
                        aria-label={`Båndet ${mønster} i ${farge}`}
                        aria-pressed={headerBilde === `${mønster}:${farge}`}
                        className={`${BÅND_KLASSER[mønster]} relative h-8 w-full rounded border ${headerBilde === `${mønster}:${farge}` ? 'border-ink/60 ring-2 ring-offset-1 ring-ink/70' : 'border-line'}`}
                        style={{ '--baand-farge': BOK_FARGE_VAR[farge] } as React.CSSProperties}
                      >
                        {headerBilde === `${mønster}:${farge}` && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="rounded-full bg-card px-1 text-sm leading-tight shadow-sm">✓</span>
                          </span>
                        )}
                      </button>
                    )),
                  )}
                </div>
                {headerBilde && (
                  <button type="submit" name="valg" value="fjern" className="self-start underline underline-offset-2 hover:text-terra">
                    fjern båndet
                  </button>
                )}
              </form>

              <form action={lastOppBokBånd.bind(null, cookbookId)} className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  name="bilde"
                  accept="image/*"
                  required
                  aria-label="Eget bilde til båndet"
                  className="text-xs file:mr-2 file:rounded-full file:border file:border-line file:bg-paper file:px-3 file:py-1 file:text-xs hover:file:border-terra"
                />
                <button type="submit" className="rounded-full border border-line px-3 py-1 hover:border-terra hover:text-terra">
                  Bruk eget bilde
                </button>
              </form>

              <form action={settBokForside.bind(null, cookbookId)} className="flex flex-col gap-2 border-t border-line pt-3">
                <span>Forsiden — det man møter før noe er slått opp:</span>

                <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Skisse på forsiden">
                  {skisseNavn.map((navn) => (
                    <label key={navn} className="cursor-pointer">
                      <input type="radio" name="skisse" value={navn} defaultChecked={cookbookData.skisse === navn} className="peer sr-only" />
                      <span title={navn} className="block rounded border border-line bg-paper p-0.5 peer-checked:ring-2 peer-checked:ring-ink/60">
                        <Skisse navn={navn} className="w-12" />
                      </span>
                    </label>
                  ))}
                  <label className="cursor-pointer">
                    <input type="radio" name="skisse" value="ingen" defaultChecked={!cookbookData.skisse} className="peer sr-only" />
                    <span className="block rounded border border-line bg-paper px-2 py-1 peer-checked:ring-2 peer-checked:ring-ink/60">ingen skisse</span>
                  </label>
                </div>

                <textarea
                  name="beskrivelse"
                  maxLength={500}
                  rows={2}
                  defaultValue={cookbookData.beskrivelse ?? undefined}
                  placeholder="Noen ord om boken — «Alt mormor aldri målte opp» …"
                  aria-label="Kort om boken"
                  className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
                />

                <button type="submit" className="self-start rounded-full border border-line px-3 py-1 hover:border-terra hover:text-terra">
                  Lagre forsiden
                </button>
              </form>
            </div>
          </details>
        )}

        {/* dobbeltstrek under tittelfeltet — den gamle kokebokens linjespill */}
        <div aria-hidden className="mt-4 border-b-4 border-double border-ink/25" />

        {bånd && (
          <div aria-hidden className="mt-4 h-24 overflow-hidden rounded-sm border border-line shadow-sm md:h-32" data-testid="bokbaand">
            {'bilde' in bånd ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bånd.bilde} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className={`h-full w-full ${BÅND_KLASSER[bånd.mønster.mønster]}`}
                style={{ '--baand-farge': BOK_FARGE_VAR[bånd.mønster.farge] } as React.CSSProperties}
              />
            )}
          </div>
        )}
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
                erEier={erEier}
                andreBøker={erEier ? cookbookData.andreBøker : []}
              />
            )}

            {erEier && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Oppskriften — bokens høyreside, med bla-om-følelsen ved hvert oppslag */}
        <div className="lg:col-span-3">
          <BlaOm>{recipe}</BlaOm>
        </div>
      </div>
    </div>
  );
}
