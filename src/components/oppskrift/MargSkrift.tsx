'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { krusseduller, type Krussedull } from '@/lib/db/schema';
import { skrivIMargen, slettMarginal, flyttMarginal } from '@/app/actions/marginalia';
import { LukkbarDetails } from '@/components/LukkbarDetails';

export type Marginal = { id: string; tekst: string | null; krussedull: Krussedull | null; posX: number | null; posY: number | null };

const ROTASJONER = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

// Krussedullene — raske tusjstreker i terra, tegnet under margskriften (eller alene: ringen
// rundt et ord trenger ingen tekst).
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

function MargInnhold({ marginal }: { marginal: Marginal }) {
  return (
    <>
      {marginal.tekst && <p className="font-skrift text-xl leading-6 break-words text-terra-deep">{marginal.tekst}</p>}
      {marginal.krussedull && <KrussedullTegn type={marginal.krussedull} className={marginal.tekst ? '-mt-0.5 w-20' : 'w-24'} />}
    </>
  );
}

function SlettKnapp({ marginalId, className }: { marginalId: string; className?: string }) {
  return (
    <form action={slettMarginal.bind(null, marginalId)} className={className} onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="submit"
        aria-label="Visk ut margskriften"
        title="Visk ut margskriften"
        className="size-6 rounded-full text-ink/25 hover:bg-ink/10 hover:text-ink"
      >
        ×
      </button>
    </form>
  );
}

function MargSkjema({ recipeId }: { recipeId: string }) {
  return (
    <LukkbarDetails>
      <summary className="cursor-pointer list-none font-skrift text-lg text-ink-soft hover:text-terra">
        ✎ skriv i margen
      </summary>

      <form action={skrivIMargen.bind(null, recipeId)} className="mt-1.5 flex flex-col gap-1.5">
        <input
          name="tekst"
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
    </LukkbarDetails>
  );
}

// Margskriften: det man MÅ huske, skrevet for hånd rett på siden. Hver skrift kan dras fritt
// rundt på oppskriftsflaten — rett ved steget den gjelder, eller ringen rundt akkurat det
// ordet; uten plassering står den i margen øverst til høyre. På små skjermer er alt en enkel
// stabel (ingen plassering med tommel på smal skjerm).
export function MargSkrift({ recipeId, marginalia }: { recipeId: string; marginalia: Marginal[] }) {
  const [, startTransition] = useTransition();
  const flateRef = useRef<HTMLDivElement>(null);

  // optimistiske plasseringer oppå serverens — nullstilles når serveren har fasit igjen
  const [plasseringer, setPlasseringer] = useState<Record<string, { x: number; y: number }>>({});
  const [drasId, setDrasId] = useState<string | null>(null);

  const drasRef = useRef(drasId);
  drasRef.current = drasId;
  const sisteRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setPlasseringer({});
  }, [marginalia]);

  // lytterne bor på window mens draget pågår — samme grep som bokhylla
  useEffect(() => {
    if (!drasId) return;

    const flytt = (e: PointerEvent) => {
      const flate = flateRef.current;
      if (!flate) return;

      const rekt = flate.getBoundingClientRect();
      const x = Math.min(Math.max((e.clientX - rekt.left) / rekt.width, 0), 0.9);
      const y = Math.min(Math.max((e.clientY - rekt.top) / rekt.height, 0), 0.97);

      sisteRef.current = { x, y };
      setPlasseringer((nå) => ({ ...nå, [drasId]: { x, y } }));
    };

    const slipp = () => {
      const id = drasRef.current;
      const pos = sisteRef.current;
      setDrasId(null);
      sisteRef.current = null;
      if (id && pos) {
        startTransition(() => {
          flyttMarginal(id, pos.x, pos.y);
        });
      }
    };

    window.addEventListener('pointermove', flytt);
    window.addEventListener('pointerup', slipp);
    window.addEventListener('pointercancel', slipp);
    return () => {
      window.removeEventListener('pointermove', flytt);
      window.removeEventListener('pointerup', slipp);
      window.removeEventListener('pointercancel', slipp);
    };
  }, [drasId, startTransition]);

  const posisjon = (marginal: Marginal) =>
    plasseringer[marginal.id] ?? (marginal.posX !== null && marginal.posY !== null ? { x: marginal.posX, y: marginal.posY } : null);

  const plasserte = marginalia.filter((marginal) => posisjon(marginal) !== null);
  const iMargen   = marginalia.filter((marginal) => posisjon(marginal) === null);

  return (
    <>
      {/* margen (md+): det uplasserte + skjemaet, flytende ved tittelen */}
      <div className="float-right mb-6 ml-8 hidden w-44 flex-col gap-5 md:flex skjul-ved-print">
        {iMargen.map((marginal, index) => (
          <div key={marginal.id} className={`${ROTASJONER[index % ROTASJONER.length]} relative cursor-grab touch-none select-none pr-6 active:cursor-grabbing`}
            onPointerDown={(e) => {
              e.preventDefault();
              setDrasId(marginal.id);
            }}
          >
            <MargInnhold marginal={marginal} />
            <SlettKnapp marginalId={marginal.id} className="absolute -right-1 top-0" />
          </div>
        ))}

        <MargSkjema recipeId={recipeId} />
      </div>

      {/* små skjermer: alt som en enkel stabel */}
      <div className="mb-6 flex w-44 flex-col gap-5 md:hidden skjul-ved-print">
        {marginalia.map((marginal, index) => (
          <div key={marginal.id} className={`${ROTASJONER[index % ROTASJONER.length]} relative pr-6`}>
            <MargInnhold marginal={marginal} />
            <SlettKnapp marginalId={marginal.id} className="absolute -right-1 top-0" />
          </div>
        ))}

        <MargSkjema recipeId={recipeId} />
      </div>

      {/* selve flaten: plasserte skrifter ligger fritt over oppskriften og kan dras videre */}
      <div ref={flateRef} aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden md:block">
        {plasserte.map((marginal) => {
          const pos = posisjon(marginal)!;

          return (
            <div
              key={marginal.id}
              style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
              className={`pointer-events-auto absolute max-w-40 -rotate-1 cursor-grab touch-none select-none pr-6 active:cursor-grabbing ${drasId === marginal.id ? 'z-20 opacity-80' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                setDrasId(marginal.id);
              }}
            >
              <MargInnhold marginal={marginal} />
              <SlettKnapp marginalId={marginal.id} className="absolute -right-1 top-0 skjul-ved-print" />
            </div>
          );
        })}
      </div>
    </>
  );
}
