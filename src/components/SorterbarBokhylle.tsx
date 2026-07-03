'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { bokFargeKlasse, bokTittelStørrelse } from '@/lib/bok-utseende';
import type { HylleElement } from '@/lib/hylle';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { lagreHylleRekkefølge, flyttBokPåHylla } from '@/app/actions/bok';

// Bokhylla på forsiden — kokebøkene pluss favoritt-boka og oppslagsboka, alle sorterbare.
// På brede skjermer bygges hylla som RADER: hver hylleplanke spenner hele bredden, og en ny
// planke legges til når raden er full (antall per rad måles av containerbredden — aldri
// hardkodet). På telefon ligger alt på én planke som scroller sidelengs, med litt overlapp.
// I "min rekkefølge"-modus kan elementene trykkes-og-dras på plass (rene pointer events —
// samme grep virker med finger og mus), med ←/→ som tastaturvennlig reserve. Rekkefølgen
// holdes optimistisk lokalt under draget og lagres i ett jafs ved slipp; serverens orden er
// ellers fasit. `hale` er det usorterbare bakerst på hylla (ny bok-skjemaet).
export function SorterbarBokhylle({ elementer, kanSortere, hale }: { elementer: HylleElement[]; kanSortere: boolean; hale?: React.ReactNode }) {
  const [rekkefølge, setRekkefølge] = useState(() => elementer.map((element) => element.id));
  const [drasId, setDrasId] = useState<string | null>(null);
  // grep og piler står fremme bare når man faktisk vil sortere — ellers er hylla ren
  const [sorterer, setSorterer] = useState(false);
  const [, startTransition] = useTransition();

  // antall per hylleplanke — null er smal skjerm (eller før første måling): én scrollende hylle
  const hylleRef = useRef<HTMLDivElement>(null);
  const [perRad, setPerRad] = useState<number | null>(null);

  // refs så slipp alltid ser siste rekkefølge, uten å re-binde lyttere per bevegelse
  const rekkefølgeRef = useRef(rekkefølge);
  rekkefølgeRef.current = rekkefølge;

  useEffect(() => {
    setRekkefølge(elementer.map((element) => element.id));
  }, [elementer]);

  // Radbredden følger containeren: bokbredde w-44 + luft gap-x-6, målt mot innholdsbredden
  // (px-3 på radene). ResizeObserver holder tallet ferskt når vinduet endrer seg.
  useEffect(() => {
    const el = hylleRef.current;
    if (!el) return;

    const BOK_PX = 176;
    const GAP_PX = 24;
    const RAD_PADDING_PX = 24;

    const mål = () => {
      const bred = window.matchMedia('(min-width: 768px)').matches;
      setPerRad(bred ? Math.max(1, Math.floor((el.clientWidth - RAD_PADDING_PX + GAP_PX) / (BOK_PX + GAP_PX))) : null);
    };

    mål();
    const observer = new ResizeObserver(mål);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
  const sorterte = [...elementer].sort((a, b) => (plass.get(a.id) ?? elementer.length) - (plass.get(b.id) ?? elementer.length));

  const celle = (element: HylleElement) => (
    <div
      key={element.id}
      data-bok-id={element.id}
      className={`relative shrink-0 transition-transform ${perRad === null ? '-ml-8 pb-4 first:ml-0' : ''} ${drasId === element.id ? 'pointer-events-none z-20 scale-105 opacity-80' : ''}`}
    >
      {/* på den scrollende hylla bærer hver bok sin egen plankebit — overlappen syr dem sammen */}
      {perRad === null && <span aria-hidden className="hylle-bit absolute -inset-x-3 bottom-0 h-4" />}
      <HylleBok element={element} />

      {kanSortere && sorterer && (
        <span className="absolute -top-3.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
          <form action={flyttBokPåHylla.bind(null, element.id, 'venstre')}>
            <button
              type="submit"
              aria-label={`Flytt ${elementNavn(element)} mot venstre`}
              title="Flytt boken mot venstre"
              className="size-7 rounded-full border border-line bg-card text-xs shadow-sm hover:border-terra hover:text-terra"
            >
              ←
            </button>
          </form>

          <button
            type="button"
            aria-label={`Dra ${elementNavn(element)} dit den skal stå`}
            title="Trykk og dra for å flytte boken"
            onPointerDown={(e) => {
              e.preventDefault();
              setDrasId(element.id);
            }}
            className="size-7 cursor-grab touch-none select-none rounded-full border border-line bg-card text-xs shadow-sm active:cursor-grabbing hover:border-terra hover:text-terra"
          >
            ⠿
          </button>

          <form action={flyttBokPåHylla.bind(null, element.id, 'høyre')}>
            <button
              type="submit"
              aria-label={`Flytt ${elementNavn(element)} mot høyre`}
              title="Flytt boken mot høyre"
              className="size-7 rounded-full border border-line bg-card text-xs shadow-sm hover:border-terra hover:text-terra"
            >
              →
            </button>
          </form>
        </span>
      )}
    </div>
  );

  // radene: alle cellene pluss halen bakerst, delt opp i fulle hyller
  const celler = [
    ...sorterte.map((element) => celle(element)),
    ...(hale ? [<div key="hale" className="relative shrink-0">{hale}</div>] : []),
  ];

  const rader: React.ReactNode[][] = [];
  if (perRad !== null) {
    for (let i = 0; i < celler.length; i += perRad) rader.push(celler.slice(i, i + perRad));
  }

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

      {perRad === null ? (
        // telefonen (og øyeblikket før første måling): én hylle som scroller sidelengs
        <div ref={hylleRef} className="flex items-end overflow-x-auto px-3 pt-5 pb-3">
          {sorterte.map((element) => celle(element))}
          {hale && (
            <div className="relative shrink-0 -ml-8 pb-4 first:ml-0">
              <span aria-hidden className="hylle-bit absolute -inset-x-3 bottom-0 h-4" />
              {hale}
            </div>
          )}
        </div>
      ) : (
        // brede skjermer: hver hylleplanke spenner hele bredden — full rad før neste legges til
        <div ref={hylleRef}>
          {rader.map((rad, indeks) => (
            <div key={indeks} className="relative flex items-end gap-x-6 px-3 pt-5 pb-4">
              <span aria-hidden className="hylle-bit absolute inset-x-0 bottom-0 h-4" />
              {rad}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function elementNavn(element: HylleElement): string {
  switch (element.slag) {
    case 'bok':        return element.name;
    case 'favoritter': return 'Favoritter';
    case 'oppslag':    return 'Oppslagsboka';
    case 'eksempel':   return 'Min første kokebok';
  }
}

function HylleBok({ element }: { element: HylleElement }) {
  if (element.slag === 'favoritter') {
    return (
      <Link prefetch={true}
        href="/favoritter"
        className="bokstoff bok-3d group relative flex h-56 w-40 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/15 bg-butter p-4 text-ink shadow-bok"
        draggable={false}
      >
        <span aria-hidden className="bok-bak pointer-events-none absolute inset-0 rounded-r-md rounded-l-sm bg-inherit" />
        <span aria-hidden className="bok-sider pointer-events-none absolute inset-y-1 right-1 w-9" />
        {/* hjertene er forsiden — strødd som på et godt brukt omslag */}
        <span aria-hidden className="pointer-events-none absolute left-3 top-5 rotate-[-14deg] text-lg text-terra/50">♥</span>
        <span aria-hidden className="pointer-events-none absolute right-4 top-3 rotate-[10deg] text-sm text-terra/40">♥</span>
        <span aria-hidden className="pointer-events-none absolute bottom-14 left-5 rotate-[8deg] text-xl text-terra/45">♥</span>
        <span aria-hidden className="pointer-events-none absolute bottom-20 right-5 rotate-[-8deg] text-base text-terra/35">♥</span>
        <span className="foto-hjorner mt-5 block bg-paper/95 px-2 py-3 text-center font-display text-xl leading-snug shadow-sm">
          ♥ Favoritter
        </span>
        <span className="text-center text-[10px] uppercase tracking-[0.25em] text-black/30 [text-shadow:0_1px_0_rgba(255,255,255,0.15)]">
          Kokekompis
        </span>
      </Link>
    );
  }

  if (element.slag === 'oppslag') {
    return (
      <Link prefetch={true}
        href="/oppslag"
        className="bokstoff bok-3d group relative flex h-56 w-40 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/20 bg-natt p-4 text-paper shadow-bok"
        draggable={false}
      >
        <span aria-hidden className="bok-bak pointer-events-none absolute inset-0 rounded-r-md rounded-l-sm bg-inherit" />
        <span aria-hidden className="bok-sider pointer-events-none absolute inset-y-1 right-1 w-9" />
        {/* ett langt ord — text-base så det aldri må deles (samme regel som bokTittelStørrelse) */}
        <span className="foto-hjorner mt-5 block overflow-hidden bg-paper/95 px-2 py-3 text-center font-display text-base leading-snug text-ink shadow-sm">
          Oppslagsboka
        </span>
        <span className="text-center text-[10px] uppercase tracking-[0.25em] text-black/30 [text-shadow:0_1px_0_rgba(255,255,255,0.15)]">
          Kokekompis
        </span>
      </Link>
    );
  }

  if (element.slag === 'eksempel') {
    // smaksprøven for gjester — samme bok-følelse, men peker inn i den innebygde eksempelboka
    return (
      <Link prefetch={true}
        href="/eksempelbok"
        className="bokstoff bok-3d group relative flex h-64 w-44 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/20 bg-sage p-4 text-paper shadow-bok"
        draggable={false}
      >
        <span aria-hidden className="bok-bak pointer-events-none absolute inset-0 rounded-r-md rounded-l-sm bg-inherit" />
        <span aria-hidden className="bok-sider pointer-events-none absolute inset-y-1 right-1 w-9" />
        <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-2 border-t-2 border-current opacity-25" />
        <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-3.5 border-t border-current opacity-25" />
        <span className="foto-hjorner mt-6 block overflow-hidden bg-paper/95 px-2 py-3 text-center font-display text-base leading-snug text-ink shadow-sm [text-wrap:balance]">
          Min første kokebok
        </span>
        <span className="text-center text-[10px] uppercase tracking-[0.25em] text-black/30 [text-shadow:0_1px_0_rgba(255,255,255,0.15)]">
          Kokekompis
        </span>
      </Link>
    );
  }

  return (
    <Link prefetch={true}
      href={uuidHref`/kokebok/${element.id}`}
      className={`${bokFargeKlasse(element.farge, element.id)} bokstoff bok-3d relative flex h-64 w-44 flex-col justify-between rounded-r-md rounded-l-sm border-l-[10px] border-black/20 p-4 shadow-bok`}
      draggable={false}
    >
      {/* tykkelsen — baksiden i bokens egen farge, og arkene som skimtes når boken
          vrir seg ut fra hyllen (dybden i .bok-bak > arkbredden, så permene henger utover) */}
      <span aria-hidden className="bok-bak pointer-events-none absolute inset-0 rounded-r-md rounded-l-sm bg-inherit" />
      <span aria-hidden className="bok-sider pointer-events-none absolute inset-y-1 right-1 w-9" />

      {/* opphøyde ryggbånd — med god luft ned til det pregede navnet */}
      <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-2 border-t-2 border-current opacity-25" />
      <span aria-hidden className="pointer-events-none absolute inset-x-1.5 top-3.5 border-t border-current opacity-25" />
      <span aria-hidden className="pointer-events-none absolute inset-x-1.5 bottom-12 border-t border-current opacity-25" />
      <span aria-hidden className="pointer-events-none absolute inset-x-1.5 bottom-[3.375rem] border-t-2 border-current opacity-25" />

      {/* skriften krymper til det lengste ordet får plass på én linje — ingen orddeling
          (den brøt ulikt og feil fra nettleser til nettleser); break-words står igjen
          som nødventil så en ekstremtittel aldri renner utenfor etiketten */}
      <span className={`foto-hjorner mt-6 block overflow-hidden break-words [text-wrap:balance] bg-paper/95 px-2 py-3 text-center font-display leading-snug text-ink shadow-sm ${bokTittelStørrelse(element.name)}`}>
        {element.name}
      </span>
      {/* trykt inn i stoffet: mørkere enn omslaget, med en anelse lys under pregekanten */}
      <span className="text-center text-[10px] uppercase tracking-[0.25em] text-black/30 [text-shadow:0_1px_0_rgba(255,255,255,0.15)]">
        Kokekompis
      </span>
    </Link>
  );
}
