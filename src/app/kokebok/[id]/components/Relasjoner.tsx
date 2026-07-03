import Link from 'next/link';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { lenkOppskrifter, fjernLenke } from '@/app/actions/lenker';
import { LukkbarDetails } from '@/components/LukkbarDetails';

export type LenketOppskrift = { linkId: string; recipeId: string; tittel: string; bokId: string; bokNavn: string };
export type LenkeKandidat = { id: string; tittel: string; bokId: string; bokNavn: string };

interface RelasjonerProps {
  cookbookId: string;
  recipeId: string;
  // stien hit — målsiden får den som ?tilbake=… så man kommer tilbake dit man var
  stiBase: string;
  utgående: LenketOppskrift[];
  innkommende: LenketOppskrift[];
  // dine oppskrifter som kan lenkes til, på tvers av bøkene (uten en selv og de alt lenkede)
  kandidater: LenkeKandidat[];
  // gjester i en utstilt bok følger lenkene, men får ikke lage eller fjerne dem
  kanRedigere: boolean;
}

// "Se også": manuelle lenker mellom oppskrifter — også på tvers av bøker. Skolebollen peker på
// vaniljekremen; vaniljekremen viser «Brukes i: Skoleboller». Står målet i en annen bok, sier
// lenken det. Navigasjonen tar med seg en tilbake-sti i URL-en, så hoppet dit (også inn i en
// annen bok) og tilbake aldri mister stedet ditt.
export function Relasjoner({ cookbookId, recipeId, stiBase, utgående, innkommende, kandidater, kanRedigere }: RelasjonerProps) {
  const tilHref = (mål: { recipeId: string; bokId: string }) =>
    `${uuidHref`/kokebok/${mål.bokId}/oppskrift/${mål.recipeId}`}?tilbake=${encodeURIComponent(stiBase)}`;

  // lenkemålene grupperes per bok i velgeren — denne boken øverst
  const kandidatBøker = [...new Map(kandidater.map((k) => [k.bokId, k.bokNavn]))]
    .sort(([aId], [bId]) => Number(bId === cookbookId) - Number(aId === cookbookId));

  return (
    <section aria-label="Se også" className="border-t border-line pt-5 skjul-ved-print">
      <h2 className="font-display text-2xl mb-3">Se også</h2>

      <div className="flex flex-wrap items-center gap-2">
        {utgående.map((lenke) => (
          <span key={lenke.linkId} className="group flex items-center rounded-full border border-line bg-card pl-4 pr-1 py-1">
            <Link prefetch={true} href={tilHref(lenke)} className="hover:text-terra">
              {lenke.tittel}
              {lenke.bokId !== cookbookId && <span className="text-xs text-ink-soft"> — i «{lenke.bokNavn}»</span>}
              {' '}→
            </Link>
            {kanRedigere && (
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
            )}
          </span>
        ))}

        {kanRedigere && kandidater.length > 0 && (
          <LukkbarDetails className="group">
            <summary className="cursor-pointer list-none rounded-full border-2 border-dashed border-line px-4 py-1 text-sm text-ink-soft hover:border-terra hover:text-terra">
              + lenk til en oppskrift
            </summary>

            <form action={lenkOppskrifter.bind(null, recipeId)} className="mt-2 flex items-center gap-2">
              <select name="til" required aria-label="Oppskrift å lenke til" className="max-w-72 rounded-lg border border-line bg-card px-3 py-1.5 text-sm">
                {kandidatBøker.map(([bokId, bokNavn]) => (
                  <optgroup key={bokId} label={bokId === cookbookId ? 'I denne boken' : bokNavn}>
                    {kandidater.filter((kandidat) => kandidat.bokId === bokId).map((kandidat) => (
                      <option key={kandidat.id} value={encodeUuidToBase32(kandidat.id)}>{kandidat.tittel}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button type="submit" className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-terra hover:text-terra">
                Lenk
              </button>
            </form>
          </LukkbarDetails>
        )}
      </div>

      {innkommende.length > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          Brukes i:{' '}
          {innkommende.map((lenke, index) => (
            <span key={lenke.linkId}>
              {index > 0 && ', '}
              <Link prefetch={true} href={tilHref(lenke)} className="underline underline-offset-2 hover:text-terra">
                {lenke.tittel}
              </Link>
              {lenke.bokId !== cookbookId && <> (i «{lenke.bokNavn}»)</>}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
