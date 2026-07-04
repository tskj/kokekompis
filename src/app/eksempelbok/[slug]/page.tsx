import Link from 'next/link';
import { notFound } from 'next/navigation';
import { finnEksempelOppskrift } from '@/lib/eksempelbok';
import { Oppskrift, lesGanger } from '@/components/oppskrift/Oppskrift';

// Ett oppslag i eksempelboka — samme oppskriftsvisning som i en ekte bok, med skalering og
// gram-visning (URL-state som ellers), men uten eierens verktøy: ingen lapper, ingen deling,
// ingen redigering. Layouten rundt (innholdslista, bokheaderen) kommer fra ../layout.tsx.

interface EksempelOppskriftProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enheter?: string; ganger?: string }>;
}

export default async function EksempelOppskriftSide({ params, searchParams }: EksempelOppskriftProps) {
  const { slug } = await params;
  const { enheter, ganger: gangerParam } = await searchParams;

  const oppskrift = finnEksempelOppskrift(slug);
  if (!oppskrift) notFound();

  return (
    <>
      <Oppskrift
        tittel={oppskrift.tittel}
        beskrivelse={oppskrift.beskrivelse}
        content={oppskrift.content}
        visEnhet={enheter === 'gram' ? 'gram' : 'original'}
        ganger={lesGanger(gangerParam, oppskrift.content.info.kanSkaleres)}
        stiBase={`/eksempelbok/${oppskrift.slug}`}
      />

      <p className="mt-10 rounded-xl border-2 border-dashed border-line bg-card/60 px-4 py-3 text-sm text-ink-soft skjul-ved-print">
        Likte du den? <Link prefetch={true} href="/" className="underline underline-offset-2 hover:text-terra">Logg inn på forsiden</Link>{' '}
        og få din egen bok å samle slike i.
      </p>
    </>
  );
}
