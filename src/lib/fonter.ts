import { fontValg, type FontValg } from '@/lib/db/schema';

// 'standard' — bokserifen fra fontprøvingens første runde — kan stå i gamle rader.
// Alt ukjent leses som montserrat, som er dagens standard.
export function lesFont(verdi: string): FontValg {
  return (fontValg as readonly string[]).includes(verdi) ? (verdi as FontValg) : 'montserrat';
}

// Radioknappene i innstillingene — navnet vises i sin egen font, så man ser hva man får.
export const FONT_PRØVER: ReadonlyArray<readonly [FontValg, string, string]> = [
  ['montserrat', 'Montserrat',   'var(--font-montserrat)'],
  ['times',      'Times',        "'Times New Roman', Times, serif"],
  ['petit',      'Petit Formal', 'var(--font-petit)'],
];
