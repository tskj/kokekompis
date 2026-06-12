import { bokFarger, type BokFarge } from '@/lib/db/schema';

// Bokens utseende, delt mellom forsiden (bokryggen på hylla) og bokens eget utseende-panel.
// Ren modul uten server-avhengigheter — brukes også fra klientkomponenter.

export const BOK_FARGE_KLASSER: Record<BokFarge, string> = {
  terra:  'bg-terra text-paper',
  sage:   'bg-sage text-paper',
  ink:    'bg-ink text-paper',
  butter: 'bg-butter text-ink',
  vin:    'bg-vin text-paper',
  natt:   'bg-natt text-paper',
};

// Bøker uten valgt farge får en stabil farge fra sin egen id — aldri fra plassen på hylla.
// (Plassbasert rotasjon ommøblerte fargene hver gang hylla ble sortert.)
const HYLLE_ROTASJON: BokFarge[] = ['terra', 'sage', 'ink', 'butter'];

export function bokFargeKlasse(farge: BokFarge | null, bokId: string): string {
  if (farge) return BOK_FARGE_KLASSER[farge];

  let hash = 0;
  for (const tegn of bokId) hash = (hash * 31 + tegn.charCodeAt(0)) % 997;

  return BOK_FARGE_KLASSER[HYLLE_ROTASJON[hash % HYLLE_ROTASJON.length]];
}

// Bokbåndet (den smale stripen mellom tittel og innhold): enten et mønster vevd i en av
// bokfargene — CSS-klassene bor i globals.css og farges via --baand-farge — eller nøkkelen til
// et opplastet bilde (bok/<id>/…webp). Lagret form: "mønster:farge" (eldre rader: bare mønster).
export const båndMønstre = ['striper', 'ruter', 'prikker'] as const;
export type BåndMønster = (typeof båndMønstre)[number];

export type BåndValg = { mønster: BåndMønster; farge: BokFarge };

export const BÅND_KLASSER: Record<BåndMønster, string> = {
  striper: 'bokbaand-striper',
  ruter:   'bokbaand-ruter',
  prikker: 'bokbaand-prikker',
};

// CSS-variabelen mønsteret veves med — peker på temafargene, så paletten bor ett sted (CSS).
export const BOK_FARGE_VAR: Record<BokFarge, string> = {
  terra:  'var(--color-terra)',
  sage:   'var(--color-sage)',
  ink:    'var(--color-ink)',
  butter: 'var(--color-butter)',
  vin:    'var(--color-vin)',
  natt:   'var(--color-natt)',
};

// drakten mønstrene ble født i — eldre rader uten farge skal se ut som før
const STANDARD_FARGE: Record<BåndMønster, BokFarge> = {
  striper: 'terra',
  ruter:   'sage',
  prikker: 'butter',
};

function erBåndMønster(verdi: string): verdi is BåndMønster {
  return (båndMønstre as readonly string[]).includes(verdi);
}

function erBokFarge(verdi: string | undefined): verdi is BokFarge {
  return verdi !== undefined && (bokFarger as readonly string[]).includes(verdi);
}

// "ruter:vin" → { mønster, farge }; "striper" (eldre rad) → mønsterets standardfarge.
// null = ikke et mønstervalg (f.eks. en opplastingsnøkkel).
export function lesBåndValg(verdi: string): BåndValg | null {
  const [mønster, farge] = verdi.split(':');
  if (!erBåndMønster(mønster)) return null;

  return { mønster, farge: erBokFarge(farge) ? farge : STANDARD_FARGE[mønster] };
}
