import type { RecipeContent } from '@/lib/db/schema';
import { Mengde, type VisEnhet } from './Mengde';

// Ingredienslista, gruppert slik oppskriften selv grupperer ("Deig", "Fyll"). Visningen kan
// konvertere volummål til gram (src/lib/enheter.ts) og skalere med porsjonsmultiplikatoren —
// originalmengden følger alltid med.
export function IngrediensListe({ content, visEnhet, ganger = 1 }: { content: RecipeContent; visEnhet: VisEnhet; ganger?: number }) {
  const grupper = new Map<string | null, RecipeContent['ingredienser']>();
  for (const ingrediens of content.ingredienser) {
    const gruppe = grupper.get(ingrediens.gruppe) ?? [];
    gruppe.push(ingrediens);
    grupper.set(ingrediens.gruppe, gruppe);
  }

  return (
    <div className="space-y-5">
      {[...grupper.entries()].map(([gruppe, ingredienser]) => (
        <div key={gruppe ?? ''}>
          {gruppe && (
            <h3 className="font-display text-base italic text-terra-deep mb-2">{gruppe}</h3>
          )}

          <ul className="space-y-1.5">
            {ingredienser.map((ingrediens) => (
              <li key={ingrediens.id} className="flex items-baseline gap-2 leading-snug">
                <span className="min-w-[5.5rem] text-right tabular-nums">
                  <Mengde ingrediens={ingrediens} visEnhet={visEnhet} ganger={ganger} />
                </span>
                <span>
                  {ingrediens.navn}
                  {ingrediens.kommentar && (
                    <span className="text-ink-soft text-sm"> — {ingrediens.kommentar}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
