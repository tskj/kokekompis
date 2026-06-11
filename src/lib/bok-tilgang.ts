import type { BokSynlighet } from '@/lib/db/schema';

// Tilgangsregelen for bøker, ett sted: eieren ser alt sitt; en utstilt bok kan hvem som helst
// lese. Alt annet finnes ikke (sidene svarer med notFound, ikke "ingen tilgang").
export function kanSeBok(bok: { userId: string; synlighet: BokSynlighet }, userId: string | null): boolean {
  return bok.userId === userId || bok.synlighet === 'utstilt';
}
