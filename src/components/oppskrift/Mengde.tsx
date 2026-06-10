import type { Ingrediens } from '@/lib/db/schema';
import { formaterMengde, tilGram } from '@/lib/enheter';

export type VisEnhet = 'original' | 'gram';

// Mengden til en ingrediens — skalert med porsjonsmultiplikatoren, i original- eller gramvisning.
// Originalen lagres alltid uskalert; både skalering og konvertering er ren visning. I gramvisning
// står originalmengden (uskalert) i parentes bak, som det historiske den er.
export function Mengde({ ingrediens, visEnhet, ganger = 1 }: { ingrediens: Ingrediens; visEnhet: VisEnhet; ganger?: number }) {
  const original = formaterMengde(ingrediens.mengde, ingrediens.enhet);
  if (!original) return null;

  const skalert = ingrediens.mengde != null ? ingrediens.mengde * ganger : null;

  const gram = skalert != null && ingrediens.enhet != null && ingrediens.enhet !== 'g'
    ? tilGram(ingrediens.navn, skalert, ingrediens.enhet)
    : null;

  if (visEnhet === 'gram' && gram != null) {
    return (
      <span className="whitespace-nowrap">
        <span className="font-semibold">{gram} g</span>{' '}
        <span className="text-ink-soft text-sm">({original}{ganger !== 1 && ' i originalen'})</span>
      </span>
    );
  }

  return <span className="font-semibold whitespace-nowrap">{formaterMengde(skalert, ingrediens.enhet)}</span>;
}
