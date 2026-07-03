import type { BokFarge } from '@/lib/db/schema';

// Hylla på forsiden er mer enn kokebøkene: favoritt-boka og oppslagsboka står der også, og kan
// sorteres inn mellom de andre. Bøkene bærer sin plass selv (cookbook.rekkefølge, 1..n seg
// imellom); spesialbøkene lagrer sin som 1-basert plass i den SAMLEDE hyllerekken
// (users.favoritterPlass / users.oppslagPlass). null = bakerst, slik hylla alltid har stått.
// Delt mellom visningen (forsiden) og sorterings-actions, så begge fletter likt.

export type HylleElement =
  | { slag: 'bok'; id: string; name: string; farge: BokFarge | null }
  | { slag: 'favoritter'; id: 'favoritter' }
  | { slag: 'oppslag'; id: 'oppslag' }
  // eksempelboka — smaksprøven en utlogget gjest kan bla i (src/lib/eksempelbok.ts)
  | { slag: 'eksempel'; id: 'eksempel' };

export const FAVORITTER_ID = 'favoritter';
export const OPPSLAG_ID    = 'oppslag';

export function flettHylle(
  bøker: Array<{ id: string; name: string; farge: BokFarge | null }>,
  favoritterPlass: number | null,
  oppslagPlass: number | null,
): HylleElement[] {
  const hylle: HylleElement[] = bøker.map((bok) => ({ slag: 'bok', ...bok }));

  // settes inn i stigende plass-rekkefølge — plassene ble talt opp mot den samlede rekken,
  // så den første innsettingen må stå før den andre telles inn
  const spesial: Array<{ element: HylleElement; plass: number | null }> = [
    { element: { slag: 'favoritter' as const, id: FAVORITTER_ID }, plass: favoritterPlass },
    { element: { slag: 'oppslag'    as const, id: OPPSLAG_ID },    plass: oppslagPlass },
  ];
  spesial.sort((a, b) => (a.plass ?? Infinity) - (b.plass ?? Infinity));

  for (const { element, plass } of spesial) {
    const indeks = plass === null ? hylle.length : Math.min(Math.max(plass - 1, 0), hylle.length);
    hylle.splice(indeks, 0, element);
  }

  return hylle;
}
