import { lastOppRettBilde, slettRettBilde } from '@/app/actions/bilder';
import { BildeInput } from '@/components/BildeInput';

export type RettBilde = { key: string; url: string };

interface RettBilderProps {
  tittel: string;
  bilder: RettBilde[];
  // satt = egen oppskrift: opplastingsskjema + slettekryss; utelatt = delingssiden, kun visning
  recipeId?: string;
}

// Bildene av den ferdige retten. URL-ene er presignerte og kortlevde, så next/image sin
// optimaliserer (som cacher per URL) ville bare kastet bort arbeid — ren <img> er riktig her.
export function RettBilder({ tittel, bilder, recipeId }: RettBilderProps) {
  if (bilder.length === 0 && !recipeId) return null;

  return (
    <div>
      {bilder.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {bilder.map((bilde, index) => (
            <figure key={bilde.key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bilde.url}
                alt={`${tittel} — bilde ${index + 1}`}
                className="h-40 w-full rounded object-cover shadow-bok"
              />
              {recipeId && (
                <form action={slettRettBilde.bind(null, recipeId, bilde.key)} className="absolute top-1.5 right-1.5 skjul-ved-print">
                  <button
                    type="submit"
                    aria-label={`Fjern bilde ${index + 1}`}
                    title="Fjern bildet"
                    className="size-7 rounded-full bg-ink/50 text-paper hover:bg-ink"
                  >
                    ×
                  </button>
                </form>
              )}
            </figure>
          ))}
        </div>
      )}

      {recipeId && (
        <form action={lastOppRettBilde.bind(null, recipeId)} className="flex flex-wrap items-center gap-2 skjul-ved-print">
          <BildeInput
            name="bilde"
            ariaLabel="Bilde av retten"
            className="text-sm file:mr-3 file:rounded-full file:border file:border-line file:bg-paper file:px-4 file:py-1.5 file:text-sm hover:file:border-terra"
          />
          <button type="submit" className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-terra hover:text-terra">
            Legg til bilde av retten
          </button>
        </form>
      )}
    </div>
  );
}
