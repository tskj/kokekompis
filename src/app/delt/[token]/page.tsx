import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { cookbook, recipes, recipeShares, users, recipeContentSchema } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { getUuidParam } from '@/lib/uuid/server-uuid-params';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { Oppskrift, lesGanger } from '@/components/oppskrift/Oppskrift';
import { RettBilder } from '@/components/oppskrift/RettBilder';
import { DelLenke } from '@/components/DelLenke';
import { leggDeltOppskriftIBok } from '@/app/actions/deling';
import { bildeUrl } from '@/lib/lagring';

interface DeltSideProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ enheter?: string; ganger?: string }>;
}

// Den offentlige delingssiden: oppskriften slik den står i boken — med opprinnelsen, som alltid
// følger med på deling — men uten postit-lapper og knapper. Lenken er stabil; den kan henge på
// et kjøleskap i årevis.
export default async function DeltSide({ params, searchParams }: DeltSideProps) {
  const token = getUuidParam(await params, 'token');
  const { enheter, ganger: gangerParam } = await searchParams;

  const userId = await getCurrentUserId();
  const delt = await withTransaction({ name: 'oppskrift.delt' }, async (tx) => {
    const share = await tx
      .select({ recipeId: recipeShares.recipeId })
      .from(recipeShares)
      .where(eq(recipeShares.id, token))
      .maybeSingle('oppskrift.delt.share');
    if (!share) return null;

    const oppskrift = await tx
      .select({
        title: recipes.title,
        description: recipes.description,
        content: recipes.content,
        eierNavn: users.name,
        eierId: recipes.userId,
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.userId, users.id))
      .where(eq(recipes.id, share.recipeId))
      .single('oppskrift.delt.recipe');

    // mottakerens egne bøker — "legg den i en av bøkene dine"
    const mineBøker = userId
      ? await tx
          .select({ id: cookbook.id, name: cookbook.name })
          .from(cookbook)
          .where(eq(cookbook.userId, userId))
          .orderBy(asc(cookbook.name))
      : [];

    return { ...oppskrift, mineBøker };
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
        <Link href="/" className="text-sm text-ink-soft hover:text-terra">{userId ? '← Bokhylla' : 'Kokekompis'}</Link>
      </header>

      {/* eieren får deleverktøyet; alle andre lettvint tilgang — kopien blir deres egen */}
      {userId === delt.eierId ? (
        <div className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-line bg-card px-4 py-3 skjul-ved-print">
          <span className="text-sm">Dette er delingslenken din — send den til en venn:</span>
          <DelLenke
            emne={`${delt.title} — en oppskrift til deg`}
            hilsen={`Hei! Jeg deler oppskriften «${delt.title}» med deg — åpne lenken, så kan du lese den og legge den i din egen bok:`}
          />
        </div>
      ) : delt.mineBøker.length > 0 ? (
        <form action={leggDeltOppskriftIBok.bind(null, token)} className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-line bg-card px-4 py-3 skjul-ved-print">
          <span className="text-sm">Vil du ha den? Legg den i en av bøkene dine:</span>
          <select name="bok" aria-label="Bok" className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm">
            {delt.mineBøker.map((bok) => (
              <option key={bok.id} value={encodeUuidToBase32(bok.id)}>{bok.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-full bg-terra px-4 py-1.5 text-sm font-medium text-paper hover:bg-terra-deep">
            Legg den i boken
          </button>
        </form>
      ) : null}

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
