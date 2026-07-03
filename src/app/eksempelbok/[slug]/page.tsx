import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EKSEMPELBOK_NAVN, EKSEMPEL_OPPSKRIFTER, finnEksempelOppskrift } from '@/lib/eksempelbok';
import { Oppskrift, lesGanger } from '@/components/oppskrift/Oppskrift';

// Én oppskrift i eksempelboka — lesbar for alle, med skalering og gram-visning (URL-state som
// ellers i appen), men uten eierens verktøy: ingen lapper, ingen deling, ingen redigering.

interface EksempelOppskriftProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enheter?: string; ganger?: string }>;
}

export default async function EksempelOppskriftSide({ params, searchParams }: EksempelOppskriftProps) {
  const { slug } = await params;
  const { enheter, ganger: gangerParam } = await searchParams;

  const oppskrift = finnEksempelOppskrift(slug);
  if (!oppskrift) notFound();

  const andre = EKSEMPEL_OPPSKRIFTER.filter((annen) => annen.slug !== slug);

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-12">
      <header className="mb-8">
        <Link prefetch={true} href="/eksempelbok" className="text-sm text-ink-soft hover:text-terra">← {EKSEMPELBOK_NAVN}</Link>
        <div aria-hidden className="mt-3 border-b-4 border-double border-ink/25" />
      </header>

      <Oppskrift
        tittel={oppskrift.tittel}
        beskrivelse={oppskrift.beskrivelse}
        content={oppskrift.content}
        visEnhet={enheter === 'gram' ? 'gram' : 'original'}
        ganger={lesGanger(gangerParam, oppskrift.content.info.kanSkaleres)}
        stiBase={`/eksempelbok/${oppskrift.slug}`}
      />

      {andre.length > 0 && (
        <nav aria-label="Flere i eksempelboka" className="mt-10 border-t border-line pt-5">
          <h2 className="font-display text-2xl mb-3">Bla videre</h2>
          <div className="flex flex-wrap gap-2">
            {andre.map((annen) => (
              <Link prefetch={true}
                key={annen.slug}
                href={`/eksempelbok/${annen.slug}`}
                className="rounded-full border border-line bg-card px-4 py-1.5 text-sm hover:border-terra hover:text-terra"
              >
                {annen.tittel} →
              </Link>
            ))}
          </div>
        </nav>
      )}

      <p className="mt-8 rounded-xl border-2 border-dashed border-line bg-card/60 px-4 py-3 text-sm text-ink-soft">
        Likte du den? <Link prefetch={true} href="/" className="underline underline-offset-2 hover:text-terra">Logg inn på forsiden</Link>{' '}
        og få din egen bok å samle slike i.
      </p>
    </main>
  );
}
