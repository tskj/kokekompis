import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { cookbook } from '@/lib/db/schema';
import { getCookbookIdParam } from '@/lib/uuid/server-uuid-params';
import { getCurrentUserId } from '@/lib/current-user';
import { kanSeBok } from '@/lib/bok-tilgang';
import { lesSkisse } from '@/lib/bok-utseende';
import { Skisse } from '@/components/skisser';

interface DefaultRecipeProps {
  params: Promise<{ id: string }>;
}

// Bokens forside: det man møter når ingen oppskrift er slått opp — en tegnet skisse og noen
// ord om boken, begge valgt i utseende-panelet. Uten valg står det gamle oppslagshintet.
export default async function DefaultRecipe({ params }: DefaultRecipeProps) {
  const cookbookId = await getCookbookIdParam(params);

  const userId = await getCurrentUserId();
  const bok = await db
    .select({ userId: cookbook.userId, beskrivelse: cookbook.beskrivelse, skisse: cookbook.skisse })
    .from(cookbook)
    .where(eq(cookbook.id, cookbookId))
    .maybeSingle('bok.forside');
  if (!bok || !kanSeBok(bok, userId)) notFound();

  const skisse = bok.skisse ? lesSkisse(bok.skisse) : null;

  return (
    <div className="flex min-h-96 items-center justify-center">
      <div className="max-w-md text-center">
        {skisse && <Skisse navn={skisse} className="mx-auto w-44 md:w-52" />}

        {bok.beskrivelse ? (
          <p className="mt-4 font-display text-2xl italic leading-relaxed text-ink-soft">{bok.beskrivelse}</p>
        ) : (
          <p className="mt-4 font-display text-3xl italic text-ink-soft">Slå opp i boken</p>
        )}

        <p className="mt-3 text-sm text-ink-soft">Velg en oppskrift fra innholdslista.</p>
      </div>
    </div>
  );
}
