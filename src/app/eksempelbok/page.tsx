import Link from 'next/link';
import { EKSEMPELBOK_NAVN, EKSEMPEL_OPPSKRIFTER } from '@/lib/eksempelbok';

// Eksempelbokas forside: innholdslista og en invitasjon — gjestens første møte med hvordan en
// bok i Kokekompis kjennes. Oppskriftene leses på /eksempelbok/<slug>.
export default function EksempelbokSide() {
  return (
    <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
      <header className="mb-8">
        <Link prefetch={true} href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>
        <h1 className="mt-1 font-display text-4xl">{EKSEMPELBOK_NAVN}</h1>
        <p className="mt-2 text-ink-soft max-w-prose">
          En smaksprøve på hvordan en bok i Kokekompis kjennes — bla i oppskriftene, skaler
          mengdene, vis dem i gram. Logger du inn, får du din egen bok å fylle.
        </p>

        <div aria-hidden className="mt-4 border-b-4 border-double border-ink/25" />
      </header>

      <nav aria-label="Innhold" className="border-t border-line">
        {EKSEMPEL_OPPSKRIFTER.map((oppskrift) => (
          <Link prefetch={true}
            key={oppskrift.slug}
            href={`/eksempelbok/${oppskrift.slug}`}
            className="group block border-b border-line py-3.5"
          >
            <span className="font-display text-xl group-hover:text-terra">{oppskrift.tittel}</span>
            <span className="mt-0.5 block text-sm text-ink-soft">{oppskrift.beskrivelse}</span>
          </Link>
        ))}
      </nav>

      <p className="mt-8 rounded-xl border-2 border-dashed border-line bg-card/60 px-4 py-3 text-sm text-ink-soft">
        Dette er Kokekompis&apos; egen bok.{' '}
        <Link prefetch={true} href="/" className="underline underline-offset-2 hover:text-terra">
          Logg inn på forsiden
        </Link>{' '}
        for å sette din egen første bok på hylla.
      </p>
    </main>
  );
}
