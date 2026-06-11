import type { BokFarge } from '@/lib/db/schema';

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

// Hylla veksler selv gjennom grunnpaletten for bøker uten valgt farge.
const HYLLE_ROTASJON: BokFarge[] = ['terra', 'sage', 'ink', 'butter'];

export function bokFargeKlasse(farge: BokFarge | null, index: number): string {
  return BOK_FARGE_KLASSER[farge ?? HYLLE_ROTASJON[index % HYLLE_ROTASJON.length]];
}

// Bokbåndet (den smale stripen mellom tittel og innhold): enten et av disse mønstrene — CSS-
// klassene bor i globals.css — eller nøkkelen til et opplastet bilde (bok/<id>/…webp).
export const båndMønstre = ['striper', 'ruter', 'prikker'] as const;
export type BåndMønster = (typeof båndMønstre)[number];

export const BÅND_KLASSER: Record<BåndMønster, string> = {
  striper: 'bokbaand-striper',
  ruter:   'bokbaand-ruter',
  prikker: 'bokbaand-prikker',
};

export function erBåndMønster(verdi: string): verdi is BåndMønster {
  return (båndMønstre as readonly string[]).includes(verdi);
}
