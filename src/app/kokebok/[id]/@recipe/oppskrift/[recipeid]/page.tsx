import Link from 'next/link';
import { eq, and, asc, ne, isNull, inArray, notInArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookbook, recipes, recipeChapters, chapters, recipeNotes, recipeLinks, recipeFavorites, recipeComments, recipeMarginalia, plans, planRecipes, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { kanSeBok } from '@/lib/bok-tilgang';
import { lagHandleliste } from '@/lib/handleliste';
import { getCookbookAndRecipeIdParams } from '@/lib/uuid/server-uuid-params';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { Oppskrift, lesGanger } from '@/components/oppskrift/Oppskrift';
import { NotatTavle, StrøddeNotater, MAKS_LAPPER_OPPE } from '@/components/oppskrift/NotatTavle';
import { RettBilder } from '@/components/oppskrift/RettBilder';
import { Relasjoner } from '@/app/kokebok/[id]/components/Relasjoner';
import { bildeUrl } from '@/lib/lagring';
import { PrintKnapp } from '@/components/PrintKnapp';
import { LukkbarDetails } from '@/components/LukkbarDetails';
import { delOppskrift } from '@/app/actions/deling';
import { flyttOppskrift } from '@/app/actions/organisering';
import { toggleFavoritt } from '@/app/actions/favoritter';
import { leggTilIPlan, fjernFraPlan } from '@/app/actions/planer';
import { taIBrukUtkast, forkastUtkast } from '@/app/actions/utkast';
import { Handleliste } from '@/components/oppskrift/Handleliste';
import { StegKommentarer } from '@/components/oppskrift/StegKommentarer';
import { MargSkrift } from '@/components/oppskrift/MargSkrift';

interface RecipePageProps {
  params: Promise<{ id: string; recipeid: string }>;
  searchParams: Promise<{ enheter?: string; tilbake?: string; ganger?: string; handleliste?: string }>;
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
        utkastAv: recipes.utkastAv,
      })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.cookbookId, cookbookId)))
      .maybeSingle('oppskrift.side');
    if (!oppskrift) return null;

    // utkast-benken: er dette en original, finn utkastene dens; er det et utkast, finn originalen
    const utkast = await tx
      .select({ id: recipes.id, title: recipes.title })
      .from(recipes)
      .where(eq(recipes.utkastAv, recipeId))
      .orderBy(asc(recipes.id));

    const original = oppskrift.utkastAv
      ? await tx
          .select({ id: recipes.id, title: recipes.title })
          .from(recipes)
          .where(eq(recipes.id, oppskrift.utkastAv))
          .maybeSingle('oppskrift.side.original')
      : null;

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
          .select({ id: recipeNotes.id, tekst: recipeNotes.tekst, farge: recipeNotes.farge, plass: recipeNotes.plass })
          .from(recipeNotes)
          .where(and(eq(recipeNotes.recipeId, recipeId), eq(recipeNotes.userId, userId)))
          .orderBy(asc(recipeNotes.createdAt))
      : [];

    // margskriften — håndskrevne påminnelser, i margen eller plassert fritt på flaten
    const marginalia = userId
      ? await tx
          .select({ id: recipeMarginalia.id, tekst: recipeMarginalia.tekst, krussedull: recipeMarginalia.krussedull, posX: recipeMarginalia.posX, posY: recipeMarginalia.posY })
          .from(recipeMarginalia)
          .where(and(eq(recipeMarginalia.recipeId, recipeId), eq(recipeMarginalia.userId, userId)))
          .orderBy(asc(recipeMarginalia.createdAt))
      : [];

    // marg-kommentarene — personlige som lappene, hengt på hvert sitt steg
    const kommentarer = userId
      ? await tx
          .select({ id: recipeComments.id, stegId: recipeComments.stegId, tekst: recipeComments.tekst })
          .from(recipeComments)
          .where(and(eq(recipeComments.recipeId, recipeId), eq(recipeComments.userId, userId)))
          .orderBy(asc(recipeComments.createdAt))
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
        isNull(recipes.utkastAv),
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

    // dine planer — målene for "Til plan …" — og hvilke av dem oppskriften alt ligger i,
    // så siden kan vise det i stedet for å la deg gjette
    const minePlaner = userId
      ? await tx
          .select({ id: plans.id, name: plans.name })
          .from(plans)
          .where(eq(plans.userId, userId))
          .orderBy(asc(plans.name))
      : [];

    const iPlaner = userId
      ? await tx
          .select({ id: plans.id, name: plans.name, ganger: planRecipes.ganger })
          .from(planRecipes)
          .innerJoin(plans, eq(planRecipes.planId, plans.id))
          .where(and(eq(planRecipes.recipeId, recipeId), eq(plans.userId, userId)))
          .orderBy(asc(plans.name))
      : [];

    return { ...oppskrift, erEier: bok.userId === userId, kapitlerIBoken, kapittelId: kapittelLenke?.chapterId ?? null, notater, marginalia, kommentarer, utkast, original, utgående, innkommende, kandidater, erFavoritt, minePlaner, iPlaner };
  });
}

export default async function RecipePage({ params, searchParams }: RecipePageProps) {
  const { cookbookId, recipeId } = await getCookbookAndRecipeIdParams(params);
  const { enheter, tilbake, ganger: gangerParam, handleliste: handlelisteParam } = await searchParams;

  const userId = await getCurrentUserId();
  const side = await getOppskriftSide(recipeId, cookbookId, userId);
  if (!side) notFound();

  const content = recipeContentSchema.parse(side.content);
  const ganger = lesGanger(gangerParam, content.info.kanSkaleres);
  const bilder = await Promise.all(content.ferdigprodukt.bilder.map(async (key) => ({ key, url: await bildeUrl(key) })));

  const stiBase = uuidHref`/kokebok/${cookbookId}/oppskrift/${recipeId}`;
  const tilbakeSti = tilbake && tilbake.startsWith('/') ? tilbake : null;

  // lapper merket "oppe" festes på høyresiden (maks fire for estetikken) — resten på tavla.
  // Tavla viser alle, og skjuler oppe-lappene kun på md+ (samme lapp vises én gang per bredde).
  const oppeLapper = side.notater.filter((notat) => notat.plass === 'oppe').slice(0, MAKS_LAPPER_OPPE);
  const tavleNotater = [...oppeLapper, ...side.notater.filter((notat) => !oppeLapper.includes(notat))];

  // handlelisten er URL-state som alt annet: ?handleliste=1 bretter den ut, lenken bevarer valgene
  const visHandleliste = handlelisteParam === '1';
  const handlelisteQuery = (med: boolean) => {
    const query = new URLSearchParams();
    if (enheter === 'gram') query.set('enheter', 'gram');
    if (ganger !== 1)       query.set('ganger', String(ganger));
    if (tilbakeSti)         query.set('tilbake', tilbakeSti);
    if (med)                query.set('handleliste', '1');

    const qs = query.toString();
    return qs ? `${stiBase}?${qs}` : stiBase;
  };

  // marg-kommentarene grupperes per steg — StegListe henter sine via kommentarFelt
  const kommentarerPerSteg = new Map<string, { id: string; tekst: string }[]>();
  for (const kommentar of side.kommentarer) {
    const liste = kommentarerPerSteg.get(kommentar.stegId) ?? [];
    liste.push({ id: kommentar.id, tekst: kommentar.tekst });
    kommentarerPerSteg.set(kommentar.stegId, liste);
  }

  const erUtkast = side.utkastAv !== null;

  // "Til plan …" tilbyr bare planene oppskriften ikke alt ligger i — resten vises som merker
  const valgbarePlaner = side.minePlaner.filter((plan) => !side.iPlaner.some((i) => i.id === plan.id));

  return (
    <>
      {tilbakeSti && (
        <p className="mb-4 skjul-ved-print">
          <Link prefetch={true}
            href={tilbakeSti}
            className="inline-block rounded-full bg-butter/40 border border-butter px-4 py-1.5 text-sm hover:bg-butter/70"
          >
            ← Tilbake dit du var
          </Link>
        </p>
      )}

      {erUtkast && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-butter bg-butter/10 px-4 py-3 skjul-ved-print">
          <p className="text-sm">
            Et utkast{side.original && (
              <> av{' '}
                <Link prefetch={true} href={uuidHref`/kokebok/${cookbookId}/oppskrift/${side.original.id}`} className="underline underline-offset-2 hover:text-terra">
                  {side.original.title}
                </Link>
              </>
            )} — eksperimenter i vei, originalen står urørt.
          </p>

          {side.erEier && (
            <span className="flex flex-wrap gap-2">
              <form action={taIBrukUtkast.bind(null, recipeId)}>
                <button type="submit" className="rounded-full bg-terra px-4 py-1.5 text-sm font-medium text-paper hover:bg-terra-deep">
                  Ta i bruk — skriv over originalen
                </button>
              </form>
              <form action={forkastUtkast.bind(null, recipeId)}>
                <button type="submit" className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-terra hover:text-terra">
                  Forkast utkastet
                </button>
              </form>
            </span>
          )}
        </div>
      )}

      {side.erEier && side.utkast.length > 0 && (
        <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-line bg-card px-4 py-2.5 text-sm skjul-ved-print">
          <span className="text-ink-soft">På benken:</span>
          {side.utkast.map((utkast, index) => (
            <Link prefetch={true}
              key={utkast.id}
              href={uuidHref`/kokebok/${cookbookId}/oppskrift/${utkast.id}`}
              className="underline underline-offset-2 hover:text-terra"
            >
              utkast {index + 1}
            </Link>
          ))}
        </div>
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
            <Link prefetch={true}
              href={`${uuidHref`/bak/${recipeId}`}?fra=${encodeURIComponent(stiBase)}${ganger !== 1 ? `&ganger=${ganger}` : ''}`}
              className="rounded-full bg-terra px-5 py-2 text-sm font-medium text-paper hover:bg-terra-deep"
            >
              Sett i gang — bakeview →
            </Link>

            {/* hjertet fargelegges når den er favoritt — bare et ikon, raden skal være rolig */}
            {userId && !erUtkast && (
              <form action={toggleFavoritt.bind(null, recipeId)}>
                <button
                  type="submit"
                  aria-pressed={side.erFavoritt}
                  aria-label={side.erFavoritt ? 'Fjern fra favoritter' : 'Merk som favoritt'}
                  title={side.erFavoritt ? 'Fjern fra favoritter' : 'Merk som favoritt'}
                  className={`flex size-9 items-center justify-center rounded-full border text-lg leading-none ${side.erFavoritt ? 'border-terra bg-terra/10 text-terra' : 'border-line text-ink-soft hover:border-terra hover:text-terra'}`}
                >
                  {side.erFavoritt ? '♥' : '♡'}
                </button>
              </form>
            )}

            {side.erEier && !erUtkast && (
              <form action={delOppskrift.bind(null, recipeId)}>
                <button type="submit" title="Bare denne oppskriften — hele boken deles fra bokas side" className="rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra">
                  Del denne oppskriften
                </button>
              </form>
            )}

            {side.erEier && (
              <Link prefetch={true}
                href={`${stiBase}/rediger`}
                className="rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra"
              >
                Rediger
              </Link>
            )}

            <PrintKnapp />

            {userId && !erUtkast && (valgbarePlaner.length > 0 || side.minePlaner.length === 0) && (
              <LukkbarDetails className="relative">
                <summary className="cursor-pointer list-none rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra">
                  Til plan …
                </summary>

                {valgbarePlaner.length > 0 ? (
                  <form action={leggTilIPlan.bind(null, recipeId)} className="absolute z-10 mt-2 flex w-64 flex-col gap-2 rounded-xl border border-line bg-card p-3 shadow-bok">
                    {/* størrelsen følger med: står oppskriften i 4× akkurat nå, planlegges 4× */}
                    <input type="hidden" name="ganger" value={ganger} />
                    <select name="plan" aria-label="Plan" className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm">
                      {valgbarePlaner.map((plan) => (
                        <option key={plan.id} value={encodeUuidToBase32(plan.id)}>{plan.name}</option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-full bg-terra px-4 py-1.5 text-sm font-medium text-paper hover:bg-terra-deep">
                      {ganger !== 1 ? `Legg i planen — ${ganger === 0.5 ? '½' : ganger}×` : 'Legg i planen'}
                    </button>
                  </form>
                ) : (
                  <p className="absolute z-10 mt-2 w-64 rounded-xl border border-line bg-card p-3 text-sm shadow-bok">
                    Ingen planer ennå —{' '}
                    <Link prefetch={true} href="/planer" className="underline underline-offset-2 hover:text-terra">legg en først</Link>.
                  </p>
                )}
              </LukkbarDetails>
            )}

            {/* ukategoriserte oppskrifter får veien inn i et kapittel rett herfra — man skal
                slippe å lete i innholdslista for å rydde */}
            {side.erEier && !erUtkast && side.kapittelId === null && side.kapitlerIBoken.length > 0 && (
              <LukkbarDetails className="relative">
                <summary className="cursor-pointer list-none rounded-full border border-dashed border-line px-4 py-2 text-sm text-ink-soft hover:border-terra hover:text-terra">
                  Ukategorisert — legg i kapittel …
                </summary>

                <form action={flyttOppskrift.bind(null, recipeId)} className="absolute z-10 mt-2 flex w-64 flex-col gap-2 rounded-xl border border-line bg-card p-3 shadow-bok">
                  <select name="kapittel" aria-label="Kapittel" className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm">
                    {side.kapitlerIBoken.map((kapittel) => (
                      <option key={kapittel.id} value={encodeUuidToBase32(kapittel.id)}>{kapittel.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-full bg-terra px-4 py-1.5 text-sm font-medium text-paper hover:bg-terra-deep">
                    Legg den der
                  </button>
                </form>
              </LukkbarDetails>
            )}

            {/* så man ser det herfra: merkene viser hvilke planer oppskriften alt ligger i */}
            {!erUtkast && side.iPlaner.map((plan) => (
              <span key={plan.id} className="flex items-center gap-0.5 rounded-full border border-sage/50 bg-sage/10 py-1 pl-3 pr-1 text-sm">
                <Link prefetch={true} href={uuidHref`/planer/${plan.id}`} className="hover:text-terra" title="Åpne planen">
                  På planen: {plan.name}{plan.ganger !== 1 && ` — ${plan.ganger === 0.5 ? '½' : plan.ganger}×`}
                </Link>
                <form action={fjernFraPlan.bind(null, plan.id, recipeId)}>
                  <button
                    type="submit"
                    aria-label={`Ta oppskriften ut av ${plan.name}`}
                    title="Ta den ut av planen"
                    className="size-6 rounded-full text-ink/30 hover:bg-ink/10 hover:text-ink"
                  >
                    ×
                  </button>
                </form>
              </span>
            ))}
          </>
        }
        kommentarFelt={userId ? (stegId) => (
          <StegKommentarer recipeId={recipeId} stegId={stegId} kommentarer={kommentarerPerSteg.get(stegId) ?? []} />
        ) : undefined}
        relasjoner={
          !erUtkast && (side.utgående.length > 0 || side.innkommende.length > 0 || (side.erEier && side.kandidater.length > 0)) ? (
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
        handleliste={
          visHandleliste ? (
            <section aria-label="Handleliste" className="max-w-xl rounded-lg border border-line bg-card p-4 skjul-ved-print">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl">Handleliste</h2>
                <Link prefetch={true} href={handlelisteQuery(false)} className="text-sm text-ink-soft underline underline-offset-2 hover:text-terra">
                  legg den bort
                </Link>
              </div>
              <Handleliste linjer={lagHandleliste([{ content }])} ganger={ganger} />
            </section>
          ) : (
            <Link prefetch={true}
              href={handlelisteQuery(true)}
              className="text-sm text-ink-soft underline underline-offset-2 hover:text-terra skjul-ved-print"
            >
              Handleliste til oppskriften
            </Link>
          )
        }
        marg={userId ? (
          <MargSkrift
            recipeId={recipeId}
            marginalia={side.marginalia}
            hale={oppeLapper.length > 0 ? <StrøddeNotater notater={oppeLapper} /> : null}
          />
        ) : null}
        notater={userId ? <NotatTavle recipeId={recipeId} notater={tavleNotater} antallStrødd={oppeLapper.length} /> : null}
      />
    </>
  );
}
