import type { Enhet } from '@/lib/db/schema';

// Enhetskonvertering for visning. Originalmengdene i en oppskrift røres ALDRI — "9 dl mel" forblir
// 9 dl i databasen (det historiske). Men dl er en koko enhet for mel: hvor mye som faktisk havner i
// bollen avhenger av fuktighet og hvor hardt man dunker målet. Derfor kan visningen konvertere
// volum til gram for tørrvarer med kjent tetthet — væsker lar vi stå i volum, der er dl presist nok.

const ML_PER_ENHET: Partial<Record<Enhet, number>> = {
  ml: 1,
  ts: 5,
  ss: 15,
  dl: 100,
  l:  1000,
};

// Tetthet i gram per desiliter for vanlige tørrvarer (norske kjøkkentabeller). Nøklene matches mot
// ingrediensnavnet per ord, med endsWith — så "hvetemel" og "sammalt mel" treffer "mel", og
// "vaniljesukker" treffer "sukker", mens "melk" IKKE treffer "mel".
const TETTHET_GRAM_PER_DL: ReadonlyArray<readonly [string, number]> = [
  ['mel', 60],
  ['melis', 60],
  ['sukker', 85],
  ['kakao', 40],
  ['havregryn', 35],
  ['kokos', 40],
  ['kokosmasse', 40],
  ['smør', 95],
  ['ris', 85],
  ['kanel', 40],
  ['salt', 120],
];

export function tetthetGramPerDl(navn: string): number | null {
  const ord = navn.toLowerCase().split(/[\s,()-]+/).filter(Boolean);

  let beste: number | null = null;
  let bestLengde = 0;

  for (const [nøkkel, tetthet] of TETTHET_GRAM_PER_DL) {
    if (nøkkel.length <= bestLengde) continue;
    if (!ord.some((o) => o === nøkkel || o.endsWith(nøkkel)))  continue;

    beste = tetthet;
    bestLengde = nøkkel.length;
  }

  return beste;
}

// Volummengde → gram, når enheten er et volum og tettheten er kjent. Ellers null (vis originalen).
export function tilGram(navn: string, mengde: number, enhet: Enhet): number | null {
  if (enhet === 'g') return mengde;
  if (enhet === 'kg') return mengde * 1000;

  const ml = ML_PER_ENHET[enhet];
  if (ml == null) return null;

  const tetthet = tetthetGramPerDl(navn);
  if (tetthet == null) return null;

  return avrundGram((mengde * ml * tetthet) / 100);
}

// Gram-presisjon ingen baker bryr seg om er bare støy: små mengder (krydder) til nærmeste gram,
// mellomstore til nærmeste 5, store til nærmeste 10.
function avrundGram(gram: number): number {
  if (gram < 20) return Math.round(gram);
  if (gram < 100) return Math.round(gram / 5) * 5;

  return Math.round(gram / 10) * 10;
}

const BRØKER: ReadonlyArray<readonly [number, string]> = [
  [0.25, '¼'],
  [0.5, '½'],
  [0.75, '¾'],
];

// "9 dl", "½ ts", "1 ½ pakke", "2 stk" — null mengde gir tom streng (rene "etter smak"-ingredienser).
export function formaterMengde(mengde: number | null, enhet: Enhet | null): string {
  if (mengde == null) return '';

  const hele = Math.trunc(mengde);
  const rest = mengde - hele;
  const brøk = BRØKER.find(([verdi]) => Math.abs(rest - verdi) < 0.01)?.[1];

  let tall: string;
  if       (brøk)        tall = hele > 0 ? `${hele} ${brøk}` : brøk;
  else if  (rest === 0)  tall = String(hele);
  else                   tall = String(mengde).replace('.', ',');

  return enhet ? `${tall} ${enhet}` : tall;
}

// "2 t 45 min" / "45 min" / "2 t" — for total- og aktivtid i infolinja.
export function formaterMinutter(minutter: number): string {
  const timer = Math.floor(minutter / 60);
  const rest = minutter % 60;

  if (timer === 0) return `${rest} min`;
  if (rest === 0)  return `${timer} t`;

  return `${timer} t ${rest} min`;
}

export function formaterVarme(varme: 'over_under' | 'varmluft' | 'grill'): string {
  switch (varme) {
    case 'over_under': return 'over- og undervarme';
    case 'varmluft':   return 'varmluft';
    case 'grill':      return 'grill';
  }
}
