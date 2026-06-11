import type { Ingrediens, RecipeContent } from '@/lib/db/schema';

// Handlelisten regnes ut fra oppskriftene ved visning — ingenting lagres. Samme ingrediens i
// samme enhet summeres på tvers av oppskrifter (og på tvers av grupper i én oppskrift: smør i
// deigen + smør i fyllet = én linje). Ulike enheter for samme navn holdes fra hverandre — å
// "summere" 2 dl og 100 g er gjetting, og en handleliste skal kunne stoles på. Mengdeløse
// linjer ("salt") samles til én per navn.
export function lagHandleliste(innhold: RecipeContent[]): Ingrediens[] {
  const linjer = new Map<string, Ingrediens>();

  for (const content of innhold) {
    for (const ingrediens of content.ingredienser) {
      const navn = ingrediens.navn.trim();
      const nøkkel = `${navn.toLowerCase()}|${ingrediens.enhet ?? ''}|${ingrediens.mengde === null ? 'uten' : 'med'}`;

      const eksisterende = linjer.get(nøkkel);
      if (!eksisterende) {
        linjer.set(nøkkel, { ...ingrediens, id: nøkkel, navn, kommentar: null, gruppe: null });
        continue;
      }

      if (eksisterende.mengde !== null && ingrediens.mengde !== null) {
        eksisterende.mengde += ingrediens.mengde;
      }
    }
  }

  return [...linjer.values()].sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));
}
