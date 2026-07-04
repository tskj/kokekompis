import Link from 'next/link';
import { BÅND_KLASSER, BOK_FARGE_VAR } from '@/lib/bok-utseende';
import { EKSEMPELBOK_NAVN } from '@/lib/eksempelbok';
import { Kaffeflekk } from '@/components/Kaffeflekk';
import { BlaOm } from '@/components/BlaOm';
import { EksempelInnhold } from './EksempelInnhold';

// Eksempelboka innvendig — NØYAKTIG samme oppsett som en ekte bok (kokebok/[id]/layout.tsx):
// bokheader med dobbelstrek og bånd, innholdslista til venstre, oppslaget til høyre med
// bla-om-animasjonen. Smakebiten skal kjennes som varen; bare eier-verktøyene mangler.
export default function EksempelbokLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto max-w-7xl p-4 sm:p-6 md:p-10">
      {/* dekor i kantene — aldri over innholdet, som i en ekte bok */}
      <Kaffeflekk className="absolute bottom-0 -left-36 w-52 rotate-6 skjul-ved-print" />
      <Kaffeflekk className="absolute -top-16 -right-24 w-64 rotate-[130deg] skjul-ved-print" />

      <header className="relative mb-8 skjul-ved-print">
        <Link prefetch={true} href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>

        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="font-display text-4xl">{EKSEMPELBOK_NAVN}</h1>
        </div>

        <p className="mt-1.5 text-xs text-ink-soft">
          Kokekompis&apos; egen smaksprøve — logg inn på forsiden, så får du din egen bok å fylle.
        </p>

        {/* dobbeltstrek under tittelfeltet — den gamle kokebokens linjespill */}
        <div aria-hidden className="mt-4 border-b-4 border-double border-ink/25" />

        <div aria-hidden className="mt-4 h-24 overflow-hidden rounded-sm border border-line shadow-sm md:h-32">
          <div
            className={`h-full w-full ${BÅND_KLASSER.striper}`}
            style={{ '--baand-farge': BOK_FARGE_VAR.sage } as React.CSSProperties}
          />
        </div>
      </header>

      {/* som i en ekte bok: på mobil kommer oppslaget FØR innholdslista */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
        <div className="order-2 lg:order-1 lg:col-span-1 skjul-ved-print">
          <div className="sticky top-6">
            <h2 className="mb-3 text-[11px] uppercase tracking-[0.2em] text-ink-soft">Innhold</h2>
            <EksempelInnhold />
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-3">
          <BlaOm>{children}</BlaOm>
        </div>
      </div>
    </div>
  );
}
