'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import type { BokFarge } from '@/lib/db/schema';
import { bokFargeKlasse } from '@/lib/bok-utseende';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { lagreHylleRekkefølge, flyttBokPåHylla } from '@/app/actions/bok';

export type HylleBok = { id: string; name: string; farge: BokFarge | null };

// Bokhylla på forsiden. I "min rekkefølge"-modus kan bøkene trykkes-og-dras på plass (rene
// pointer events — samme grep virker med finger og mus), med ←/→ som tastaturvennlig reserve.
// Rekkefølgen holdes optimistisk lokalt under draget og lagres i ett jafs ved slipp;
// serverens orden er ellers fasit. `hale` er det som står bakerst på hylla (favoritter, ny bok).
export function SorterbarBokhylle({ bøker, kanSortere, hale }: { bøker: HylleBok[]; kanSortere: boolean; hale?: React.ReactNode }) {
  const [rekkefølge, setRekkefølge] = useState(() => bøker.map((bok) => bok.id));
  const [drasId, setDrasId] = useState<string | null>(null);
  // grep og piler står fremme bare når man faktisk vil sortere — ellers er hylla ren
  const [sorterer, setSorterer] = useState(false);
  const [, startTransition] = useTransition();

  // refs så slipp alltid ser siste rekkefølge, uten å re-binde lyttere per bevegelse
  const rekkefølgeRef = useRef(rekkefølge);
  rekkefølgeRef.current = rekkefølge;

  useEffect(() => {
    setRekkefølge(bøker.map((bok) => bok.id));
  }, [bøker]);

  // Lytterne bor på window mens draget pågår: den optimistiske omstokkingen flytter grepet i
  // DOM-en, og en flyttet node slipper pointer capture — vindusnivået overlever omstokkingen.
  useEffect(() => {
    if (!drasId) return;

    const draTil = (e: PointerEvent) => {
      const målId = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((el) => (el.closest('[data-bok-id]') as HTMLElement | null)?.dataset.bokId)
        .find((id) => id && id !== drasId);
      if (!målId) return;

      setRekkefølge((nå) => {
        const fra = nå.indexOf(drasId);
        const til = nå.indexOf(målId);
        if (fra === -1 || til === -1 || fra === til) return nå;

        const uten = nå.filter((id) => id !== drasId);
        uten.splice(til, 0, drasId);

        return uten;
      });
    };

    const slipp = () => {
      setDrasId(null);
      startTransition(() => {
        lagreHylleRekkefølge(rekkefølgeRef.current);
      });
    };

    window.addEventListener('pointermove', draTil);
    window.addEventListener('pointerup', slipp);
    window.addEventListener('pointercancel', slipp);
    return () => {
      window.removeEventListener('pointermove', draTil);
      window.removeEventListener('pointerup', slipp);
      window.removeEventListener('pointercancel', slipp);
    };
  }, [drasId, startTransition]);

  const plass = new Map(rekkefølge.map((id, indeks) => [id, indeks]));
  const sorterte = [...bøker].sort((a, b) => (plass.get(a.id) ?? bøker.length) - (plass.get(b.id) ?? bøker.length));

  return (
    <div>
      {kanSortere && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setSorterer((nå) => !nå)}
            aria-pressed={sorterer}
            className={`rounded-full border px-3.5 py-1.5 text-xs ${sorterer ? 'border-terra bg-terra/10 text-terra' : 'border-line text-ink-soft hover:border-terra hover:text-terra'}`}
          >
            {sorterer ? '✓ Ferdig sortert' : '⠿ Sorter hylla'}
          </button>
        </div>
      )}

      {/* hver bok bærer sin egen bit av treplanken (pb-4 + .hylle-bit) — radene får dermed
          hver sin hylle uansett hvor flexen bryter */}
      <div className="flex items-end overflow-x-auto px-3 pt-5 pb-3 md:flex-wrap md:gap-x-6 md:gap-y-8 md:overflow-visible">
      {sorterte.map((bok) => (
        <div
          key={bok.id}
          data-bok-id={bok.id}
          className={`relative shrink-0 -ml-8 pb-4 transition-transform first:ml-0 md:ml-0 ${drasId === bok.id ? 'pointer-events-none z-20 scale-105 opacity-80' : ''}`}
        >
          <span aria-hidden className="hylle-bit absolute -inset-x-3 bottom-0 h-4" />
          <Link prefetch={true}
            href={uuidHref`/kokebok/${bok.id}`}
            className={`${bokFargeKlasse(bok.farge, bok.id)} bokstoff relative flex h-64 w-44 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/20 p-4 shadow-bok transition-transform hover:-translate-y-2`}
            draggable={false}
          >
            {/* opphøyde ryggbånd — med god luft ned til det pregede navnet */}
            <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-2 border-t-2 border-current opacity-25" />
            <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-3.5 border-t border-current opacity-25" />
            <span aria-hidden className="pointer-events-none absolute inset-x-1.5 bottom-12 border-t border-current opacity-25" />
            <span aria-hidden className="pointer-events-none absolute inset-x-1.5 bottom-[3.375rem] border-t-2 border-current opacity-25" />

            {/* lange ord bryter med bindestrek (hyphens følger lang="nb") — og aldri utenfor feltet */}
            <span className="mt-6 block overflow-hidden break-words [hyphens:auto] bg-paper/95 px-2 py-3 text-center font-display text-xl leading-snug text-ink shadow-sm">
              {bok.name}
            </span>
            {/* trykt inn i stoffet: mørkere enn omslaget, med en anelse lys under pregekanten */}
            <span className="text-center text-[10px] uppercase tracking-[0.25em] text-black/30 [text-shadow:0_1px_0_rgba(255,255,255,0.15)]">
              Kokekompis
            </span>
          </Link>

          {kanSortere && sorterer && (
            <span className="absolute -top-3.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
              <form action={flyttBokPåHylla.bind(null, bok.id, 'venstre')}>
                <button
                  type="submit"
                  aria-label={`Flytt ${bok.name} mot venstre`}
                  title="Flytt boken mot venstre"
                  className="size-7 rounded-full border border-line bg-card text-xs shadow-sm hover:border-terra hover:text-terra"
                >
                  ←
                </button>
              </form>

              <button
                type="button"
                aria-label={`Dra ${bok.name} dit den skal stå`}
                title="Trykk og dra for å flytte boken"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDrasId(bok.id);
                }}
                className="size-7 cursor-grab touch-none select-none rounded-full border border-line bg-card text-xs shadow-sm active:cursor-grabbing hover:border-terra hover:text-terra"
              >
                ⠿
              </button>

              <form action={flyttBokPåHylla.bind(null, bok.id, 'høyre')}>
                <button
                  type="submit"
                  aria-label={`Flytt ${bok.name} mot høyre`}
                  title="Flytt boken mot høyre"
                  className="size-7 rounded-full border border-line bg-card text-xs shadow-sm hover:border-terra hover:text-terra"
                >
                  →
                </button>
              </form>
            </span>
          )}
        </div>
      ))}

        {hale}
      </div>
    </div>
  );
}
