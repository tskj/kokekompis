import Link from 'next/link';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { chapters, cookbook, recipes } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { getCookbookIdParam } from '@/lib/uuid/server-uuid-params';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { importerFraBilde, importerFraTekst, importerFraUrl } from '@/app/actions/importer';
import { opprettTomOppskrift } from '@/app/actions/rediger';
import { lagUtkastFraSkjema } from '@/app/actions/utkast';
import { SendeKnapp } from '@/components/SendeKnapp';

interface ImporterPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feil?: string }>;
}

function KapittelVelger({ kapitler }: { kapitler: Array<{ id: string; name: string }> }) {
  return (
    <label className="block text-sm">
      <span className="text-ink-soft">Inn i kapittel</span>
      <select
        name="kapittel"
        required
        className="mt-1 block w-full rounded-lg border border-line bg-card px-3 py-2"
      >
        {kapitler.map((kapittel) => (
          <option key={kapittel.id} value={encodeUuidToBase32(kapittel.id)}>{kapittel.name}</option>
        ))}
        <option value="ingen">Ukategorisert — uten kapittel</option>
      </select>
    </label>
  );
}

// Ny oppskrift inn i boken: lim inn en lenke (innholdet hentes nå — lenker forsvinner, boken
// består) eller ta bilde av en fysisk oppskrift. AI-en strukturerer; du redigerer etterpå.
export default async function ImporterPage({ params, searchParams }: ImporterPageProps) {
  const cookbookId = await getCookbookIdParam(params);
  const { feil } = await searchParams;

  const userId = await getCurrentUserId();
  if (!userId) notFound();

  const { kapitler, oppskrifter } = await withTransaction({ name: 'importer.side' }, async (tx) => {
    // import er en endring av boken — kun eieren kommer hit, gjester i utstilte bøker gjør ikke
    const bok = await tx
      .select({ id: cookbook.id })
      .from(cookbook)
      .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
      .maybeSingle('importer.side.bok');
    if (!bok) notFound();

    return {
      kapitler: await tx
        .select({ id: chapters.id, name: chapters.name })
        .from(chapters)
        .where(eq(chapters.cookbookId, cookbookId))
        .orderBy(asc(chapters.order)),

      // bokens oppskrifter — kildene man kan lage et utkast av
      oppskrifter: await tx
        .select({ id: recipes.id, title: recipes.title })
        .from(recipes)
        .where(and(eq(recipes.cookbookId, cookbookId), isNull(recipes.utkastAv)))
        .orderBy(asc(recipes.title)),
    };
  });

  return (
    <div className="max-w-2xl">
      <header className="relative mb-8">
        {/* veien ut — kom man hit ved et uhell, er bokens forside ett trykk unna */}
        <Link prefetch={true}
          href={uuidHref`/kokebok/${cookbookId}`}
          aria-label="Lukk — tilbake til boken"
          title="Tilbake til boken"
          className="absolute -top-1 right-0 flex size-8 items-center justify-center rounded-full border border-line text-ink-soft hover:border-terra hover:text-terra"
        >
          ×
        </Link>

        <h1 className="font-display text-4xl">Ny oppskrift</h1>
        <p className="mt-2 text-ink-soft max-w-prose">
          Skriv den selv, lim inn en lenke eller hele teksten fra en side, eller ta et bilde —
          kokekompisen leser og fører den inn i boken med mengder, steg og opprinnelse.
        </p>
      </header>

      {feil && (
        <p role="alert" className="mb-6 rounded-lg border-2 border-terra/50 bg-terra/10 px-4 py-3">
          {feil}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <form action={importerFraUrl.bind(null, cookbookId)} className="space-y-4 rounded-xl border border-line bg-card p-5 shadow-bok">
          <h2 className="font-display text-2xl">Fra en lenke</h2>
          <p className="text-sm text-ink-soft">
            Innholdet hentes her og nå og blir ditt — lenker forsvinner, boken består.
          </p>

          <label className="block text-sm">
            <span className="text-ink-soft">Nettadresse</span>
            <input
              type="url"
              name="url"
              required
              placeholder="https://…"
              className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
            />
          </label>

          <KapittelVelger kapitler={kapitler} />

          <SendeKnapp barn="Hent oppskriften" venteTekst="Leser oppskriften — et halvt minutts tid …" />
        </form>

        <form action={importerFraTekst.bind(null, cookbookId)} className="space-y-4 rounded-xl border border-line bg-card p-5 shadow-bok">
          <h2 className="font-display text-2xl">Lim inn teksten</h2>
          <p className="text-sm text-ink-soft">
            Vil ikke lenken? Åpne siden, merk alt (Ctrl/Cmd+A), kopier og lim inn her —
            kokekompisen finner oppskriften i rotet.
          </p>

          <label className="block text-sm">
            <span className="text-ink-soft">Teksten fra siden</span>
            <textarea
              name="tekst"
              required
              rows={6}
              placeholder="Lim inn alt — meny og reklame gjør ingenting, kokekompisen plukker ut oppskriften."
              className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
            />
          </label>

          <KapittelVelger kapitler={kapitler} />

          <SendeKnapp barn="Les teksten" venteTekst="Leser teksten — et halvt minutts tid …" />
        </form>

        <form action={importerFraBilde.bind(null, cookbookId)} className="space-y-4 rounded-xl border border-line bg-card p-5 shadow-bok">
          <h2 className="font-display text-2xl">Fra et bilde</h2>
          <p className="text-sm text-ink-soft">
            Mormors kort, en kokebokside, en utskrift — ta bilde eller velg fra kamerarullen.
          </p>

          <label className="block text-sm">
            <span className="text-ink-soft">Bilde av oppskriften</span>
            <input
              type="file"
              name="bilde"
              accept="image/*"
              capture="environment"
              required
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-full file:border file:border-line file:bg-paper file:px-4 file:py-1.5 file:text-sm hover:file:border-terra"
            />
          </label>

          <KapittelVelger kapitler={kapitler} />

          <SendeKnapp barn="Skann oppskriften" venteTekst="Leser bildet — et halvt minutts tid …" />
        </form>

        <form action={opprettTomOppskrift.bind(null, cookbookId)} className="space-y-4 rounded-xl border-2 border-dashed border-line bg-card/60 p-5">
          <h2 className="font-display text-2xl">Skriv den selv</h2>
          <p className="text-sm text-ink-soft">
            En blank side rett inn i redigeringen — for oppskriften som bare finnes i hodet ditt.
          </p>

          <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra">
            Begynn å skrive
          </button>
        </form>

        {oppskrifter.length > 0 && (
          <form action={lagUtkastFraSkjema} className="space-y-4 rounded-xl border-2 border-dashed border-line bg-card/60 p-5">
            <h2 className="font-display text-2xl">Eksperimenter med en du har</h2>
            <p className="text-sm text-ink-soft">
              Et utkast er en kopi å prøve seg i — originalen står urørt til du eventuelt tar utkastet i bruk.
            </p>

            <label className="block text-sm">
              <span className="text-ink-soft">Hvilken oppskrift?</span>
              <select name="oppskrift" required className="mt-1 block w-full rounded-lg border border-line bg-card px-3 py-2">
                {oppskrifter.map((oppskrift) => (
                  <option key={oppskrift.id} value={encodeUuidToBase32(oppskrift.id)}>{oppskrift.title}</option>
                ))}
              </select>
            </label>

            <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra">
              Lag et utkast
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
