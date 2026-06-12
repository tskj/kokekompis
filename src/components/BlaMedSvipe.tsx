'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRecipeId } from '@/hooks/useUuidParams';

export type Oppslag = { id: string; href: string };

// Bla i boka med fingeren: et tydelig horisontalt sveip over oppslaget går til neste/forrige
// oppskrift i lesefølgen (kapitlene i rekkefølge, så ukategorisert). Fra bokens forside blar
// et sveip inn på første oppskrift. Vertikal scrolling er uberørt — vi rører aldri
// preventDefault, og krever et sveip som er klart mer sidelengs enn nedover.
export function BlaMedSvipe({ oppskrifter, children }: { oppskrifter: Oppslag[]; children: React.ReactNode }) {
  const router = useRouter();
  const gjeldendeId = useRecipeId();
  const start = useRef<{ x: number; y: number } | null>(null);

  const indeks = oppskrifter.findIndex((oppslag) => oppslag.id === gjeldendeId);

  function bla(retning: 1 | -1) {
    const mål = indeks === -1
      ? (retning === 1 ? oppskrifter[0] : undefined)
      : oppskrifter[indeks + retning];
    if (mål) router.push(mål.href);
  }

  return (
    <div
      onTouchStart={(e) => {
        start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        const fra = start.current;
        start.current = null;
        if (!fra) return;

        const dx = e.changedTouches[0].clientX - fra.x;
        const dy = e.changedTouches[0].clientY - fra.y;
        if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

        bla(dx < 0 ? 1 : -1);
      }}
    >
      {children}
    </div>
  );
}
