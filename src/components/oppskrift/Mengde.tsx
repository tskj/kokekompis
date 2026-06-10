import type { Ingrediens } from '@/lib/db/schema';
import { formaterMengde, tilGram } from '@/lib/enheter';

export type VisEnhet = 'original' | 'gram';

// Mengden til en ingrediens, i original- eller gramvisning. Originalen lagres alltid og vises
// alltid — i gramvisning står den i parentes bak, som det historiske den er.
export function Mengde({ ingrediens, visEnhet }: { ingrediens: Ingrediens; visEnhet: VisEnhet }) {
  const original = formaterMengde(ingrediens.mengde, ingrediens.enhet);
  if (!original) return null;

  const gram = ingrediens.mengde != null && ingrediens.enhet != null && ingrediens.enhet !== 'g'
    ? tilGram(ingrediens.navn, ingrediens.mengde, ingrediens.enhet)
    : null;

  if (visEnhet === 'gram' && gram != null) {
    return (
      <span className="whitespace-nowrap">
        <span className="font-semibold">{gram} g</span>{' '}
        <span className="text-ink-soft text-sm">({original})</span>
      </span>
    );
  }

  return <span className="font-semibold whitespace-nowrap">{original}</span>;
}
