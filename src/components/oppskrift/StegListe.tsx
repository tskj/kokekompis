import type { RecipeContent } from '@/lib/db/schema';
import { formaterMinutter } from '@/lib/enheter';

// Fremgangsmåten i det klassiske viewet: nummererte steg uten mengder (de står i ingredienslista —
// flettingen hører hjemme i bakeviewet). Ventesteg merkes med tid, imens-steg med en liten pil.
// kommentarFelt henger marg-kommentarene (og skjemaet deres) under hvert steg — utelates på
// delingssiden, der ingen kommenterer.
export function StegListe({ content, kommentarFelt }: { content: RecipeContent; kommentarFelt?: (stegId: string) => React.ReactNode }) {
  return (
    <ol className="space-y-5">
      {content.steg.map((steg, index) => (
        <li key={steg.id} className="flex gap-4">
          <span className="font-display text-2xl italic text-terra w-7 shrink-0 text-right leading-none pt-0.5">
            {index + 1}
          </span>

          <div className="min-w-0 flex-1 leading-relaxed">
            <p>{steg.tekst}</p>

            {steg.passiv && (
              <p className="mt-1 text-sm text-ink-soft">
                ◷ {steg.passiv.hva}
                {steg.passiv.minutter != null && <> — ca. {formaterMinutter(steg.passiv.minutter)}</>}
              </p>
            )}
            {steg.imens && (
              <p className="mt-1 text-sm italic text-sage">↳ kan gjøres mens forrige steg venter</p>
            )}

            {kommentarFelt?.(steg.id)}
          </div>
        </li>
      ))}
    </ol>
  );
}
