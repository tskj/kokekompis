import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { oppslag } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';
import { finnInnebygdOppslag } from '@/lib/oppslag';
import { OppslagTegning } from '@/components/oppslag-tegninger';
import { slettOppslag } from '@/app/actions/oppslag';

// Ett oppslag i Oppslagsboka — høyresiden av boken, som en oppskrift i en kokebok.
// De innebygde nås på navnet sitt (/oppslag/kokte-egg); dine egne på sin (base32-)id,
// og bare av deg. Layouten rundt (innholdslista, bokheaderen) kommer fra ../layout.tsx.

interface OppslagSideProps {
  params: Promise<{ id: string }>;
}

export default async function OppslagSide({ params }: OppslagSideProps) {
  const { id } = await params;

  const innebygd = finnInnebygdOppslag(id);
  if (innebygd) {
    return (
      <article className="max-w-2xl">
        <header className="mb-6 flex items-center gap-4">
          <OppslagTegning id={innebygd.id} className="w-16 shrink-0 md:w-20" />
          <h1 className="font-display text-4xl leading-tight">{innebygd.tittel}</h1>
        </header>

        <p className="whitespace-pre-line leading-relaxed">{innebygd.tekst}</p>
      </article>
    );
  }

  // ikke et innebygd oppslag — da må det være ditt eget
  const oppslagId = parseUuidParam(id);
  if (!oppslagId) notFound();

  const userId = await getCurrentUserId();
  if (!userId) notFound();

  const eget = await db
    .select({ id: oppslag.id, tittel: oppslag.tittel, tekst: oppslag.tekst })
    .from(oppslag)
    .where(and(eq(oppslag.id, oppslagId), eq(oppslag.userId, userId)))
    .maybeSingle('oppslag.side');
  if (!eget) notFound();

  return (
    <article className="max-w-2xl">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl leading-tight">{eget.tittel}</h1>

        <form action={slettOppslag.bind(null, eget.id)}>
          <button
            type="submit"
            title="Slett oppslaget — det kan ikke angres"
            className="rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft hover:border-terra hover:text-terra"
          >
            Slett oppslaget
          </button>
        </form>
      </header>

      <p className="whitespace-pre-line leading-relaxed">{eget.tekst}</p>
    </article>
  );
}
