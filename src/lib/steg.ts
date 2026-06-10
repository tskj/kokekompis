import type { Ingrediens, RecipeContent, Steg } from '@/lib/db/schema';
import { shouldNever } from '@/lib/assert';

// Steg-logikken bak bakeviewet: stegene refererer ingredienser via id, og her slås de opp så
// mengdene kan flettes inn i selve steget ("pisk egg og sukker" + kortene «2 egg», «3 dl sukker»).
// Parallellisering: et passivt steg (heving, steking) er "i gang" mens de påfølgende imens-stegene
// gjøres — bakeviewet viser da ventingen som et eget kort ved siden av arbeidssteget.

// Ingrediensene et steg bruker, i stegets egen rekkefølge. En referanse uten treff er en data-bug
// (skjemaet garanterer det ikke) — i prod hopper vi over den i stedet for å velte siden.
export function ingredienserForSteg(content: RecipeContent, steg: Steg): Ingrediens[] {
  const perId = new Map(content.ingredienser.map((i) => [i.id, i]));

  const funnet: Ingrediens[] = [];
  for (const id of steg.ingredienser) {
    const ingrediens = perId.get(id);
    if (shouldNever(ingrediens == null, 'steg.ukjent-ingrediens', `steg "${steg.id}" refererer ukjent ingrediens "${id}"`)) continue;

    funnet.push(ingrediens!);
  }

  return funnet;
}

// Den pågående ventingen sett fra steget på `gjeldendeIndex`: bare definert når man står på et
// imens-steg, og bare når alle stegene mellom ventingen og her selv er imens-steg (ellers har noe
// brutt kjeden og ventingen er over). Returnerer null når ingenting venter i bakgrunnen.
export function pågåendeVenting(steg: Steg[], gjeldendeIndex: number): Steg | null {
  const gjeldende = steg[gjeldendeIndex];
  if (!gjeldende?.imens) return null;

  for (let i = gjeldendeIndex - 1; i >= 0; i--) {
    const kandidat = steg[i];
    if (kandidat.passiv) return kandidat;
    if (!kandidat.imens) return null;
  }

  return null;
}
