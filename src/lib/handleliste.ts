import type { Ingrediens, RecipeContent } from '@/lib/db/schema';

// Handlelisten regnes ut fra oppskriftene ved visning — ingenting lagres. Hver rett ganges med
// størrelsen den skal lages i (4× boller = 4× mel), så summeres samme ingrediens i samme enhet
// på tvers av oppskrifter (og på tvers av grupper i én oppskrift: smør i deigen + smør i fyllet
// = én linje). Ulike enheter for samme navn holdes fra hverandre — å "summere" 2 dl og 100 g er
// gjetting, og en handleliste skal kunne stoles på. Mengdeløse linjer ("salt") samles til én
// per navn.
export type HandlelisteRett = { content: RecipeContent; ganger?: number };

export function lagHandleliste(retter: HandlelisteRett[]): Ingrediens[] {
  const linjer = new Map<string, Ingrediens>();

  for (const { content, ganger = 1 } of retter) {
    for (const ingrediens of content.ingredienser) {
      const navn = ingrediens.navn.trim();
      const mengde = ingrediens.mengde === null ? null : ingrediens.mengde * ganger;
      const nøkkel = `${navn.toLowerCase()}|${ingrediens.enhet ?? ''}|${mengde === null ? 'uten' : 'med'}`;

      const eksisterende = linjer.get(nøkkel);
      if (!eksisterende) {
        linjer.set(nøkkel, { ...ingrediens, id: nøkkel, navn, mengde, kommentar: null, gruppe: null });
        continue;
      }

      if (eksisterende.mengde !== null && mengde !== null) {
        eksisterende.mengde += mengde;
      }
    }
  }

  return [...linjer.values()].sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
}
