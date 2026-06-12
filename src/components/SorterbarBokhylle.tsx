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
    <div className="flex items-end overflow-x-auto pt-5 border-b-8 border-ink/80 md:flex-wrap md:gap-6 md:overflow-visible">
      {sorterte.map((bok) => (
        <div
          key={bok.id}
          data-bok-id={bok.id}
          className={`relative shrink-0 -ml-8 transition-transform first:ml-0 md:ml-0 ${drasId === bok.id ? 'pointer-events-none z-20 scale-105 opacity-80' : ''}`}
        >
          <Link
            href={uuidHref`/kokebok/${bok.id}`}
            className={`${bokFargeKlasse(bok.farge, bok.id)} relative flex h-64 w-44 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/20 p-4 shadow-bok transition-transform hover:-translate-y-2`}
            draggable={false}
          >
            {/* opphøyde ryggbånd — de tverrgående ribbene på en gammel innbinding */}
            <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-2 border-t-2 border-current opacity-25" />
            <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-3.5 border-t border-current opacity-25" />
            <span aria-hidden className="pointer-events-none absolute inset-x-1.5 bottom-7 border-t border-current opacity-25" />
            <span aria-hidden className="pointer-events-none absolute inset-x-1.5 bottom-[2.125rem] border-t-2 border-current opacity-25" />

            <span className="mt-6 block bg-paper/95 px-2 py-3 text-center font-display text-xl leading-snug text-ink shadow-sm">
              {bok.name}
            </span>
            <span className="text-center text-[10px] uppercase tracking-[0.25em] opacity-70">
              Kokekompis
            </span>
          </Link>

          {kanSortere && (
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
  );
}
