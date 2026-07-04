import { Skisse } from '@/components/skisser';
import { EKSEMPEL_BESKRIVELSE } from '@/lib/eksempelbok';

// Eksempelbokas forside — det man møter når ingen oppskrift er slått opp, nøyaktig som i en
// ekte bok: en tegnet skisse og noen ord om boken.
export default function EksempelbokForside() {
  return (
    <div className="flex min-h-96 items-center justify-center">
      <div className="max-w-md text-center">
        <Skisse navn="croissant" className="mx-auto w-44 md:w-52" />

        <p className="mt-4 font-display text-2xl italic leading-relaxed text-ink-soft">{EKSEMPEL_BESKRIVELSE}</p>

        <p className="mt-3 text-sm text-ink-soft">Velg en oppskrift fra innholdslista.</p>
      </div>
    </div>
  );
}
