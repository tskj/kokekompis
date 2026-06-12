import Link from 'next/link';
import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookbookShares, recipes, users, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getUuidParam } from '@/lib/uuid/server-uuid-params';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { Oppskrift, lesGanger } from '@/components/oppskrift/Oppskrift';
import { RettBilder } from '@/components/oppskrift/RettBilder';
import { bildeUrl } from '@/lib/lagring';

interface DeltBokOppskriftProps {
  params: Promise<{ token: string; recipeid: string }>;
  searchParams: Promise<{ enheter?: string; ganger?: string }>;
}

// En oppskrift lest gjennom en delt bok: samme visning som delingssiden — uten lapper og
// knapper — med veien tilbake til bokens innholdsliste.
export default async function DeltBokOppskrift({ params, searchParams }: DeltBokOppskriftProps) {
  const løsteParams = await params;
  const token = getUuidParam(løsteParams, 'token');
  const recipeId = getUuidParam(løsteParams, 'recipeid');
  const { enheter, ganger: gangerParam } = await searchParams;

  const delt = await withTransaction({ name: 'bok.delt.oppskrift' }, async (tx) => {
    const share = await tx
      .select({ cookbookId: cookbookShares.cookbookId })
      .from(cookbookShares)
      .where(eq(cookbookShares.id, token))
      .maybeSingle('bok.delt.oppskrift.share');
    if (!share) return null;

    // oppskriften må stå i den delte boken — tokenet gir ikke nøkkel til noe annet
    return tx
      .select({
        title: recipes.title,
        description: recipes.description,
        content: recipes.content,
        eierNavn: users.name,
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.userId, users.id))
      .where(and(eq(recipes.id, recipeId), eq(recipes.cookbookId, share.cookbookId)))
      .maybeSingle('bok.delt.oppskrift.recipe');
  });
  if (!delt) notFound();

  const content = recipeContentSchema.parse(delt.content);
  const bilder = await Promise.all(content.ferdigprodukt.bilder.map(async (key) => ({ key, url: await bildeUrl(key) })));

  const stiBase = uuidHref`/delt-bok/${token}/oppskrift/${recipeId}`;

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <header className="mb-8 flex items-baseline justify-between gap-4 border-b border-line pb-4 skjul-ved-print">
        <Link prefetch={true} href={uuidHref`/delt-bok/${token}`} className="text-sm text-ink-soft hover:text-terra">
          ← Tilbake til boken
        </Link>
        <p className="font-display italic text-lg text-ink-soft">
          Delt fra {delt.eierNavn ? `${delt.eierNavn}s` : 'en'} kokebok
        </p>
      </header>

      <Oppskrift
        tittel={delt.title}
        beskrivelse={delt.description}
        content={content}
        visEnhet={enheter === 'gram' ? 'gram' : 'original'}
        ganger={lesGanger(gangerParam, content.info.kanSkaleres)}
        stiBase={stiBase}
        ferdigBilder={<RettBilder tittel={delt.title} bilder={bilder} />}
      />
    </main>
  );
}
