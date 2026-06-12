import { leggTilKommentar, slettKommentar } from '@/app/actions/kommentarer';

export type Kommentar = { id: string; tekst: string };

// Google docs i margen: små merknader hengt på akkurat dette steget — "oi, denne ble svidd i
// kantene, prøv mindre egg neste gang". Gule lapper er for hele oppskriften; dette er for steget.
export function StegKommentarer({ recipeId, stegId, kommentarer }: { recipeId: string; stegId: string; kommentarer: Kommentar[] }) {
  return (
    <div className="mt-1.5 space-y-1.5 skjul-ved-print">
      {kommentarer.map((kommentar) => (
        <div key={kommentar.id} className="relative max-w-md rounded-r-lg border-l-2 border-butter bg-butter/15 py-1 pl-3 pr-8">
          <p className="text-sm italic text-ink-soft">{kommentar.tekst}</p>

          <form action={slettKommentar.bind(null, kommentar.id)} className="absolute right-1 top-0.5">
            <button
              type="submit"
              aria-label="Slett kommentaren"
              title="Slett kommentaren"
              className="size-6 rounded-full text-ink/30 hover:bg-ink/10 hover:text-ink"
            >
              ×
            </button>
          </form>
        </div>
      ))}

      <details>
        <summary className="cursor-pointer list-none text-xs text-ink-soft/80 hover:text-terra">+ kommentar</summary>
        <form action={leggTilKommentar.bind(null, recipeId, stegId)} className="mt-1 flex max-w-md items-center gap-2">
          <input
            name="tekst"
            required
            maxLength={500}
            placeholder="Oi — denne ble svidd i kantene …"
            aria-label="Kommentar til steget"
            className="w-full rounded-lg border border-line bg-card px-3 py-1.5 text-sm focus:border-terra focus:outline-none"
          />
          <button type="submit" className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm hover:border-terra hover:text-terra">
            Heng på
          </button>
        </form>
      </details>
    </div>
  );
}
