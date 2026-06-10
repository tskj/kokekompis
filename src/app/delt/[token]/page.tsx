import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { recipes, recipeShares, users, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getUuidParam } from '@/lib/uuid/server-uuid-params';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { Oppskrift } from '@/components/oppskrift/Oppskrift';
import { RettBilder } from '@/components/oppskrift/RettBilder';
import { bildeUrl } from '@/lib/lagring';

interface DeltSideProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ enheter?: string }>;
}

// Den offentlige delingssiden: oppskriften slik den står i boken — med opprinnelsen, som alltid
// følger med på deling — men uten postit-lapper og knapper. Lenken er stabil; den kan henge på
// et kjøleskap i årevis.
export default async function DeltSide({ params, searchParams }: DeltSideProps) {
  const token = getUuidParam(await params, 'token');
  const { enheter } = await searchParams;

  const delt = await withTransaction({ name: 'oppskrift.delt' }, async (tx) => {
    const share = await tx
      .select({ recipeId: recipeShares.recipeId })
      .from(recipeShares)
      .where(eq(recipeShares.id, token))
      .maybeSingle('oppskrift.delt.share');
    if (!share) return null;

    return tx
      .select({
        title: recipes.title,
        description: recipes.description,
        content: recipes.content,
        eierNavn: users.name,
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.userId, users.id))
      .where(eq(recipes.id, share.recipeId))
      .single('oppskrift.delt.recipe');
  });
  if (!delt) notFound();

  const content = recipeContentSchema.parse(delt.content);
  const bilder = await Promise.all(content.ferdigprodukt.bilder.map(async (key) => ({ key, url: await bildeUrl(key) })));

  const stiBase = uuidHref`/delt/${token}`;

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <header className="mb-8 flex items-baseline justify-between gap-4 border-b border-line pb-4 skjul-ved-print">
        <p className="font-display italic text-lg text-ink-soft">
          Delt fra {delt.eierNavn ? `${delt.eierNavn}s` : 'en'} kokebok
        </p>
        <Link href="/" className="text-sm text-ink-soft hover:text-terra">Kokekompis</Link>
      </header>

      <Oppskrift
        tittel={delt.title}
        beskrivelse={delt.description}
        content={content}
        visEnhet={enheter === 'gram' ? 'gram' : 'original'}
        stiBase={stiBase}
        ferdigBilder={<RettBilder tittel={delt.title} bilder={bilder} />}
      />
    </main>
  );
}
