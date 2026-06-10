import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chapters } from '@/lib/db/schema';
import { getCookbookIdParam } from '@/lib/uuid/server-uuid-params';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { importerFraBilde, importerFraUrl } from '@/app/actions/importer';

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

  const kapitler = await db
    .select({ id: chapters.id, name: chapters.name })
    .from(chapters)
    .where(eq(chapters.cookbookId, cookbookId))
    .orderBy(asc(chapters.order));

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="font-display text-4xl">Ny oppskrift</h1>
        <p className="mt-2 text-ink-soft max-w-prose">
          Lim inn en lenke eller ta et bilde — kokekompisen leser oppskriften og fører den inn i
          boken med mengder, steg og opprinnelse. Det tar gjerne et halvt minutts tid.
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

          <button type="submit" className="rounded-full bg-terra px-5 py-2 text-sm font-medium text-paper hover:bg-terra-deep">
            Hent oppskriften
          </button>
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

          <button type="submit" className="rounded-full bg-terra px-5 py-2 text-sm font-medium text-paper hover:bg-terra-deep">
            Skann oppskriften
          </button>
        </form>
      </div>
    </div>
  );
}
