import Link from 'next/link';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { lenkOppskrifter, fjernLenke } from '@/app/actions/lenker';

export type LenketOppskrift = { linkId: string; recipeId: string; tittel: string };
export type LenkeKandidat = { id: string; tittel: string };

interface RelasjonerProps {
  cookbookId: string;
  recipeId: string;
  // stien hit — målsiden får den som ?tilbake=… så man kommer tilbake dit man var
  stiBase: string;
  utgående: LenketOppskrift[];
  innkommende: LenketOppskrift[];
  // andre oppskrifter i boken som kan lenkes til (uten en selv og de alt lenkede)
  kandidater: LenkeKandidat[];
}

// "Se også": manuelle lenker mellom oppskrifter i boken. Skolebollen peker på vaniljekremen;
// vaniljekremen viser «Brukes i: Skoleboller». Navigasjonen tar med seg en tilbake-sti i URL-en,
// så hoppet dit og tilbake aldri mister stedet ditt.
export function Relasjoner({ cookbookId, recipeId, stiBase, utgående, innkommende, kandidater }: RelasjonerProps) {
  const tilHref = (målId: string) =>
    `${uuidHref`/kokebok/${cookbookId}/oppskrift/${målId}`}?tilbake=${encodeURIComponent(stiBase)}`;

  return (
    <section aria-label="Se også" className="border-t border-line pt-5 skjul-ved-print">
      <h2 className="font-display text-2xl mb-3">Se også</h2>

      <div className="flex flex-wrap items-center gap-2">
        {utgående.map((lenke) => (
          <span key={lenke.linkId} className="group flex items-center rounded-full border border-line bg-card pl-4 pr-1 py-1">
            <Link href={tilHref(lenke.recipeId)} className="hover:text-terra">
              {lenke.tittel} →
            </Link>
            <form action={fjernLenke.bind(null, lenke.linkId)}>
              <button
                type="submit"
                aria-label={`Fjern lenken til ${lenke.tittel}`}
                title="Fjern lenken"
                className="ml-1 size-6 rounded-full text-ink/30 hover:bg-ink/10 hover:text-ink"
              >
                ×
              </button>
            </form>
          </span>
        ))}

        {kandidater.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none rounded-full border-2 border-dashed border-line px-4 py-1 text-sm text-ink-soft hover:border-terra hover:text-terra">
              + lenk til en oppskrift
            </summary>

            <form action={lenkOppskrifter.bind(null, recipeId)} className="mt-2 flex items-center gap-2">
              <select name="til" required aria-label="Oppskrift å lenke til" className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm">
                {kandidater.map((kandidat) => (
                  <option key={kandidat.id} value={encodeUuidToBase32(kandidat.id)}>{kandidat.tittel}</option>
                ))}
              </select>
              <button type="submit" className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-terra hover:text-terra">
                Lenk
              </button>
            </form>
          </details>
        )}
      </div>

      {innkommende.length > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          Brukes i:{' '}
          {innkommende.map((lenke, index) => (
            <span key={lenke.linkId}>
              {index > 0 && ', '}
              <Link href={tilHref(lenke.recipeId)} className="underline underline-offset-2 hover:text-terra">
                {lenke.tittel}
              </Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
