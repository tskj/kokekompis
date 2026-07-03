import Link from 'next/link';
import { eq, and, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookbook, recipes, recipeNotes, recipeContentSchema, type RecipeContent, type Steg } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { kanSeBok } from '@/lib/bok-tilgang';
import { getUuidParam } from '@/lib/uuid/server-uuid-params';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { ingredienserForSteg, pågåendeVenting } from '@/lib/steg';
import { formaterMinutter } from '@/lib/enheter';
import { Mengde } from '@/components/oppskrift/Mengde';
import { lesGanger } from '@/components/oppskrift/Oppskrift';
import { BakNotater } from './components/BakNotater';

// Bakeviewet: arbeidsmodusen for skitne fingre. Låst til ett lesbart view — ingen scroll, ingen
// redigering, ett steg om gangen med mengdene flettet inn i steget. Wizard, ikke side. All state
// ligger i URL-en (?steg=N&modus=…), så frem/tilbake er vanlige lenker med digre treffflater.

type Modus = 'linear' | 'parallell';

interface BakPageProps {
  params: Promise<{ recipeid: string }>;
  searchParams: Promise<{ steg?: string; modus?: string; fra?: string; ganger?: string }>;
}

function bakHref(recipeId: string, steg: number, modus: Modus, fra: string | undefined, ganger: number): string {
  const query = new URLSearchParams({ steg: String(steg) });
  if (modus !== 'parallell') query.set('modus', modus);
  if (fra) query.set('fra', fra);
  if (ganger !== 1) query.set('ganger', String(ganger));

  return `${uuidHref`/bak/${recipeId}`}?${query}`;
}

function StegKort({ steg, nummer, content, ganger }: { steg: Steg; nummer: number; content: RecipeContent; ganger: number }) {
  const ingredienser = ingredienserForSteg(content, steg);

  // Maren ser ikke så dårlig: på telefon krymper tekst og styr, så steget OG lappene får plass
  // uten scrolling — lappene er det som må være godt synlig midt i stekingen.
  if (steg.passiv) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-butter bg-butter/20 p-5 text-center md:gap-4 md:p-8">
        <span aria-hidden className="font-display text-4xl md:text-6xl">◷</span>
        <p className="font-display text-2xl capitalize md:text-4xl">{steg.passiv.hva}</p>
        {steg.passiv.minutter != null && (
          <p className="font-display text-lg text-ink-soft md:text-xl">ca. {formaterMinutter(steg.passiv.minutter)}</p>
        )}
        <p className="max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">{steg.tekst}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center gap-4 rounded-xl border border-line bg-card p-5 shadow-bok md:gap-6 md:p-8">
      <p className="font-display text-sm italic text-terra md:text-base">Steg {nummer}</p>
      <p className="text-xl leading-snug md:text-4xl md:leading-snug">{steg.tekst}</p>

      {ingredienser.length > 0 && (
        <ul className="flex flex-wrap gap-2 md:gap-3">
          {ingredienser.map((ingrediens) => (
            <li key={ingrediens.id} className="rounded-lg border border-line bg-paper px-3 py-1.5 text-base md:px-4 md:py-2.5 md:text-xl">
              <Mengde ingrediens={ingrediens} visEnhet="original" ganger={ganger} /> {ingrediens.navn}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ImensKort({ venting }: { venting: Steg }) {
  if (!venting.passiv) return null;

  return (
    <aside className="flex flex-col justify-center gap-1.5 rounded-xl border-2 border-dashed border-butter bg-butter/15 p-4 md:gap-2 md:p-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">Imens, i bakgrunnen</p>
      <p className="font-display text-lg capitalize md:text-2xl">◷ {venting.passiv.hva}</p>
      {venting.passiv.minutter != null && (
        <p className="text-sm text-ink-soft md:text-base">ca. {formaterMinutter(venting.passiv.minutter)}</p>
      )}
    </aside>
  );
}

export default async function BakPage({ params, searchParams }: BakPageProps) {
  const recipeId = getUuidParam(await params, 'recipeid');
  const sp = await searchParams;

  const userId = await getCurrentUserId();
  const data = await withTransaction({ name: 'bakeview' }, async (tx) => {
    // tilgangen følger boken oppskriften står i: privat = bare eieren, utstilt = alle
    const oppskrift = await tx
      .select({ id: recipes.id, title: recipes.title, content: recipes.content, bokEier: cookbook.userId })
      .from(recipes)
      .innerJoin(cookbook, eq(recipes.cookbookId, cookbook.id))
      .where(eq(recipes.id, recipeId))
      .maybeSingle('bakeview.recipe');
    if (!oppskrift || !kanSeBok({ userId: oppskrift.bokEier }, userId)) return null;

    const notater = userId
      ? await tx
          .select({ id: recipeNotes.id, tekst: recipeNotes.tekst, farge: recipeNotes.farge, plass: recipeNotes.plass })
          .from(recipeNotes)
          .where(and(eq(recipeNotes.recipeId, recipeId), eq(recipeNotes.userId, userId)))
          .orderBy(asc(recipeNotes.createdAt))
      : [];

    return { ...oppskrift, notater };
  });
  if (!data) notFound();

  const content = recipeContentSchema.parse(data.content);
  if (content.steg.length === 0) notFound();

  // URL-state: 1-basert steg, klampet; modus styrer om ventinger vises parallelt
  const modus: Modus = sp.modus === 'linear' ? 'linear' : 'parallell';
  const fra = sp.fra && sp.fra.startsWith('/') ? sp.fra : undefined;
  const ganger = lesGanger(sp.ganger, content.info.kanSkaleres);
  const stegNummer = Math.min(Math.max(Number(sp.steg) || 1, 1), content.steg.length);
  const stegIndex = stegNummer - 1;

  const gjeldende = content.steg[stegIndex];
  const venting = modus === 'parallell' ? pågåendeVenting(content.steg, stegIndex) : null;
  const neste = content.steg[stegIndex + 1];
  const erSiste = stegIndex === content.steg.length - 1;

  return (
    <div className="flex h-dvh flex-col overflow-hidden p-4 md:p-6">
      <header className="flex items-baseline justify-between gap-4 pb-3">
        <Link prefetch={true} href={fra ?? '/'} className="text-sm text-ink-soft hover:text-terra">← Legg fra deg bakeviewet</Link>

        <p className="hidden truncate font-display italic text-ink-soft md:block">
          {data.title}
          {ganger !== 1 && <span className="ml-2 rounded-full bg-terra px-2 py-0.5 font-sans text-sm not-italic text-paper">{ganger === 0.5 ? '½' : ganger}×</span>}
        </p>

        <p className="text-sm text-ink-soft" aria-label="Modus">
          {modus === 'parallell' ? (
            <Link prefetch={true} href={bakHref(recipeId, stegNummer, 'linear', fra, ganger)} className="underline underline-offset-2 hover:text-terra">
              vis ett og ett steg
            </Link>
          ) : (
            <Link prefetch={true} href={bakHref(recipeId, stegNummer, 'parallell', fra, ganger)} className="underline underline-offset-2 hover:text-terra">
              vis ventinger parallelt
            </Link>
          )}
        </p>
      </header>

      <main className={`grid min-h-0 flex-1 gap-4 ${venting ? 'md:grid-cols-[1fr_16rem]' : ''}`}>
        <StegKort steg={gjeldende} nummer={stegNummer} content={content} ganger={ganger} />
        {venting && <ImensKort venting={venting} />}
      </main>

      {modus === 'parallell' && neste && (
        <p className="truncate pt-3 text-sm text-ink-soft">
          {neste.imens && gjeldende.passiv ? 'Du kan fortsette imens — neste: ' : 'Neste: '}
          {neste.tekst}
        </p>
      )}

      <BakNotater recipeId={recipeId} notater={data.notater} />

      <nav className="flex items-center gap-3 pt-3" aria-label="Steg">
        {stegNummer > 1 ? (
          <Link prefetch={true}
            href={bakHref(recipeId, stegNummer - 1, modus, fra, ganger)}
            className="rounded-xl border border-line bg-card px-4 py-3 text-base hover:border-terra hover:text-terra md:px-10 md:py-4 md:text-lg"
          >
            ← Forrige
          </Link>
        ) : (
          <span className="rounded-xl border border-line px-4 py-3 text-base text-line md:px-10 md:py-4 md:text-lg">← Forrige</span>
        )}

        <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5" aria-label={`Steg ${stegNummer} av ${content.steg.length}`}>
          {content.steg.map((s, i) => (
            <Link prefetch={true}
              key={s.id}
              href={bakHref(recipeId, i + 1, modus, fra, ganger)}
              aria-label={`Gå til steg ${i + 1}`}
              className={`size-3 rounded-full ${i === stegIndex ? 'bg-terra' : s.passiv ? 'border border-butter bg-butter/40 hover:bg-butter' : 'bg-line hover:bg-terra/50'}`}
            />
          ))}
        </div>

        {erSiste ? (
          <Link prefetch={true}
            href={fra ?? '/'}
            className="rounded-xl bg-sage px-4 py-3 text-base font-medium text-paper hover:opacity-90 md:px-10 md:py-4 md:text-lg"
          >
            Ferdig ✓
          </Link>
        ) : (
          <Link prefetch={true}
            href={bakHref(recipeId, stegNummer + 1, modus, fra, ganger)}
            className="rounded-xl bg-terra px-4 py-3 text-base font-medium text-paper hover:bg-terra-deep md:px-10 md:py-4 md:text-lg"
          >
            Neste →
          </Link>
        )}
      </nav>
    </div>
  );
}
