import { krusseduller, type Krussedull } from '@/lib/db/schema';
import { skrivIMargen, slettMarginal } from '@/app/actions/marginalia';

export type Marginal = { id: string; tekst: string; krussedull: Krussedull | null };

const ROTASJONER = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

// Krussedullene — raske tusjstreker i terra, tegnet under margskriften.
function KrussedullTegn({ type, className }: { type: Krussedull; className?: string }) {
  const STREKER: Record<Krussedull, React.ReactNode> = {
    strek:   <path d="M4 14 q8 -7 16 -1 q8 6 16 0 q8 -6 18 1" />,
    pil:     <path d="M4 17 q22 -13 44 -6 m-9 -7 l10 6 l-11 4" />,
    stjerne: <path d="M30 3 l2.5 8 8.5 0.5 -6.5 5.5 2 8.5 -6.5 -5 -7 5 2 -8.5 -6 -5.5 8.5 -0.5 z" />,
    utrop:   <><path d="M30 3 q3 7 0.5 13" /><path d="M30.5 20.5 a0.5 0.5 0 0 0 0.2 0.4" strokeWidth="3.5" /></>,
    ring:    <path d="M30 5 c15 -1 25 3 25 8 c0 5 -13 8 -26 8 c-13 0 -24 -3 -24 -8 c0 -5 13 -9 28 -8 c9 1 16 3 16 6" />,
  };

  return (
    <svg viewBox="0 0 60 24" aria-hidden className={className} fill="none" stroke="#b04e28" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {STREKER[type]}
    </svg>
  );
}

// Margskriften: det man MÅ huske, skrevet for hånd rett på siden — ingen lapp, bare tusj.
// Brukes både i margen (md+) og over lappetavla på små skjermer; forelderen styrer hvilken
// kopi som vises (samme mønster som de strødde lappene).
export function MargSkrift({ recipeId, marginalia }: { recipeId: string; marginalia: Marginal[] }) {
  return (
    <div className="flex w-44 flex-col gap-5 skjul-ved-print">
      {marginalia.map((marginal, index) => (
        <div key={marginal.id} className={`${ROTASJONER[index % ROTASJONER.length]} relative pr-6`}>
          <p className="font-skrift text-xl leading-6 break-words text-terra-deep">{marginal.tekst}</p>
          {marginal.krussedull && <KrussedullTegn type={marginal.krussedull} className="-mt-0.5 w-20" />}

          <form action={slettMarginal.bind(null, marginal.id)} className="absolute -right-1 top-0">
            <button
              type="submit"
              aria-label="Visk ut margskriften"
              title="Visk ut margskriften"
              className="size-6 rounded-full text-ink/25 hover:bg-ink/10 hover:text-ink"
            >
              ×
            </button>
          </form>
        </div>
      ))}

      <details>
        <summary className="cursor-pointer list-none font-skrift text-lg text-ink-soft hover:text-terra">
          ✎ skriv i margen
        </summary>

        <form action={skrivIMargen.bind(null, recipeId)} className="mt-1.5 flex flex-col gap-1.5">
          <input
            name="tekst"
            required
            maxLength={200}
            placeholder="MÅ heve over natten!"
            aria-label="Margskrift"
            className="w-full rounded border border-line bg-card px-2 py-1 font-skrift text-lg text-terra-deep placeholder:text-ink/35 focus:border-terra focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Krussedull">
            <label className="cursor-pointer">
              <input type="radio" name="krussedull" value="" defaultChecked className="peer sr-only" />
              <span className="block rounded border border-line px-1.5 py-0.5 text-xs text-ink-soft peer-checked:ring-2 peer-checked:ring-ink/60">uten</span>
            </label>
            {krusseduller.map((krussedull) => (
              <label key={krussedull} className="cursor-pointer">
                <input type="radio" name="krussedull" value={krussedull} className="peer sr-only" />
                <span title={krussedull} className="block rounded border border-line px-1 peer-checked:ring-2 peer-checked:ring-ink/60">
                  <KrussedullTegn type={krussedull} className="w-8" />
                </span>
              </label>
            ))}
          </div>

          <button type="submit" className="self-start rounded-full border border-line px-2.5 py-0.5 text-sm hover:border-terra hover:text-terra">
            Skriv
          </button>
        </form>
      </details>
    </div>
  );
}
