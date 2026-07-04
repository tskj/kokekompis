import { OppslagTegning } from '@/components/oppslag-tegninger';

// Oppslagsbokas forside — det man møter når ingenting er slått opp, som i kokebøkene:
// en tegning og noen ord, og pekeren mot innholdslista.
export default function OppslagForside() {
  return (
    <div className="flex min-h-96 items-center justify-center">
      <div className="max-w-md text-center">
        <OppslagTegning id="maal-og-vekt" className="mx-auto w-32 md:w-40" />

        <p className="mt-4 font-display text-2xl italic leading-relaxed text-ink-soft">
          Alt man ellers googler — skrevet opp én gang for alle.
        </p>

        <p className="mt-3 text-sm text-ink-soft">Velg et oppslag fra innholdslista.</p>
      </div>
    </div>
  );
}
