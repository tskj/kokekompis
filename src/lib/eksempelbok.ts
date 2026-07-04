import type { RecipeContent } from '@/lib/db/schema';
import { skillingsboller, focaccia, fiskesuppe, pannekaker } from '@/lib/db/seed-oppskrifter';

// Eksempelboka: «Min første kokebok» på den utloggede forsiden — en smaksprøve gjesten kan bla
// i før innlogging. Ren, innebygd data uten database: ekte bøker er alltid private, så gjesten
// møter appens egen bok, ikke noens hylle.

export type EksempelOppskrift = {
  slug: string;
  tittel: string;
  beskrivelse: string;
  content: RecipeContent;
};

export const EKSEMPELBOK_NAVN = 'Min første kokebok';

export const EKSEMPEL_OPPSKRIFTER: EksempelOppskrift[] = [
  {
    slug: 'mormors-skillingsboller',
    tittel: 'Mormors skillingsboller',
    beskrivelse: 'Myke kanelboller slik mormor lagde dem — tunge av kardemomme og kanel.',
    content: skillingsboller,
  },
  {
    slug: 'focaccia-med-rosmarin',
    tittel: 'Focaccia med rosmarin',
    beskrivelse: 'Italiensk langpannebrød med dype oljegroper og flaksalt.',
    content: focaccia,
  },
  {
    slug: 'mammas-pannekaker',
    tittel: 'Mammas pannekaker',
    beskrivelse: 'Tynne pannekaker med svellet røre, akkurat som på lørdagene hjemme.',
    content: pannekaker,
  },
  {
    slug: 'pappas-fiskesuppe',
    tittel: 'Pappas fiskesuppe',
    beskrivelse: 'Kremet suppe der laksen trekker, aldri koker.',
    content: fiskesuppe,
  },
];

export function finnEksempelOppskrift(slug: string): EksempelOppskrift | null {
  return EKSEMPEL_OPPSKRIFTER.find((oppskrift) => oppskrift.slug === slug) ?? null;
}

// Innholdslista i eksempelboka — kapitler som i en ekte bok, med slugs inn i oppskriftene
export const EKSEMPEL_BESKRIVELSE = 'Slik kjennes en bok i Kokekompis — bla, skaler, vis i gram.';

export const EKSEMPEL_KAPITLER: Array<{ navn: string; oppskrifter: string[] }> = [
  { navn: 'Bakst',  oppskrifter: ['mormors-skillingsboller', 'focaccia-med-rosmarin'] },
  { navn: 'Middag', oppskrifter: ['mammas-pannekaker', 'pappas-fiskesuppe'] },
];
