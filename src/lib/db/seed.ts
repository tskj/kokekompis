import { deriveDbUrl } from '../../../scripts/db-name.mjs';
import type { RecipeContent } from '@/lib/db/schema';

// Point this process at the per-worktree database BEFORE @/lib/db reads DATABASE_URL — hence the
// dynamic imports inside seed() rather than static ones. Run via `pnpm db:seed`.
process.env.DATABASE_URL = deriveDbUrl(process.env.DATABASE_URL ?? '');

const USER_ID = '00091a95-ec3b-4119-b1cf-736bb7b02b9c';

const skillingsboller: RecipeContent = {
  info: {
    porsjoner: { antall: 16, benevnelse: 'boller' },
    kanSkaleres: true,
    aktivTidMinutter: 40,
    totalTidMinutter: 165,
    stekeinfo: { graderCelsius: 220, varme: 'over_under', minutter: 12 },
  },
  opprinnelse: {
    type: 'person',
    navn: 'Mormor Åse',
    url: null,
    historie: 'Mormor målte aldri noe på kjøkkenet på Sotra — dette er nærmeste oversettelse til mål og vekt. Hun brukte alltid litt mer kanel enn folk tør.',
  },
  ingredienser: [
    { id: 'melk', navn: 'helmelk', mengde: 5, enhet: 'dl', kommentar: null, gruppe: 'Deig' },
    { id: 'smor-deig', navn: 'smør', mengde: 100, enhet: 'g', kommentar: null, gruppe: 'Deig' },
    { id: 'gjar', navn: 'fersk gjær', mengde: 0.5, enhet: 'pakke', kommentar: null, gruppe: 'Deig' },
    { id: 'sukker-deig', navn: 'sukker', mengde: 1, enhet: 'dl', kommentar: null, gruppe: 'Deig' },
    { id: 'kardemomme', navn: 'malt kardemomme', mengde: 1, enhet: 'ts', kommentar: null, gruppe: 'Deig' },
    { id: 'salt', navn: 'salt', mengde: 0.5, enhet: 'ts', kommentar: null, gruppe: 'Deig' },
    { id: 'hvetemel', navn: 'hvetemel', mengde: 9, enhet: 'dl', kommentar: 'mormor regnet alltid i desiliter', gruppe: 'Deig' },
    { id: 'smor-fyll', navn: 'smør', mengde: 100, enhet: 'g', kommentar: 'romtemperert', gruppe: 'Fyll' },
    { id: 'sukker-fyll', navn: 'sukker', mengde: 1, enhet: 'dl', kommentar: null, gruppe: 'Fyll' },
    { id: 'kanel', navn: 'kanel', mengde: 2, enhet: 'ss', kommentar: 'gjerne en ss til', gruppe: 'Fyll' },
    { id: 'egg', navn: 'egg', mengde: 1, enhet: 'stk', kommentar: 'til pensling', gruppe: null },
  ],
  steg: [
    {
      id: 'varm-melk',
      tekst: 'Smelt smøret i en kjele, hell i melken og varm blandingen til den er fingervarm.',
      ingredienser: ['smor-deig', 'melk'],
      passiv: null,
      imens: false,
    },
    {
      id: 'los-gjar',
      tekst: 'Smuldre gjæren i en stor bolle og hell over den fingervarme melkeblandingen. Rør til gjæren er helt oppløst.',
      ingredienser: ['gjar'],
      passiv: null,
      imens: false,
    },
    {
      id: 'elt',
      tekst: 'Bland inn sukker, kardemomme, salt og det meste av melet. Elt i ti minutter — deigen skal slippe bollen, men fortsatt være myk og litt klissete.',
      ingredienser: ['sukker-deig', 'kardemomme', 'salt', 'hvetemel'],
      passiv: null,
      imens: false,
    },
    {
      id: 'heving',
      tekst: 'La deigen heve under et klede på et lunt sted til dobbel størrelse.',
      ingredienser: [],
      passiv: { hva: 'heving', minutter: 60 },
      imens: false,
    },
    {
      id: 'fyll',
      tekst: 'Rør romtemperert smør, sukker og kanel sammen til et jevnt, smørbart fyll.',
      ingredienser: ['smor-fyll', 'sukker-fyll', 'kanel'],
      passiv: null,
      imens: true,
    },
    {
      id: 'kjevle',
      tekst: 'Slå ned deigen og kjevle den ut til en stor leiv, omtrent en halv centimeter tykk.',
      ingredienser: [],
      passiv: null,
      imens: false,
    },
    {
      id: 'rull',
      tekst: 'Smør fyllet utover hele leiven, rull sammen til en stram pølse og skjær i 16 jevne skiver. Legg dem med snittflaten opp på brett med bakepapir.',
      ingredienser: [],
      passiv: null,
      imens: false,
    },
    {
      id: 'etterheving',
      tekst: 'La bollene etterheve under kledet.',
      ingredienser: [],
      passiv: { hva: 'etterheving', minutter: 30 },
      imens: false,
    },
    {
      id: 'pensle',
      tekst: 'Pisk egget lett og pensle bollene rundhåndet.',
      ingredienser: ['egg'],
      passiv: null,
      imens: false,
    },
    {
      id: 'steking',
      tekst: 'Stek midt i ovnen til de er gyllenbrune.',
      ingredienser: [],
      passiv: { hva: 'steking', minutter: 12 },
      imens: false,
    },
    {
      id: 'avkjol',
      tekst: 'Avkjøl på rist under et klede — da holder de seg myke til dagen etter. Hvis de varer så lenge.',
      ingredienser: [],
      passiv: null,
      imens: false,
    },
  ],
  ferdigprodukt: {
    bilder: [],
    tekst: 'Myke, gylne og tunge av kanel. Lukten skal nå naboen.',
  },
};

const sjokoladekake: RecipeContent = {
  info: {
    porsjoner: { antall: 12, benevnelse: 'stykker' },
    kanSkaleres: false,
    aktivTidMinutter: 25,
    totalTidMinutter: 100,
    stekeinfo: { graderCelsius: 175, varme: 'varmluft', minutter: 35 },
  },
  opprinnelse: {
    type: 'nettside',
    navn: 'Det søte liv',
    url: 'https://www.detsoteliv.no/oppskrift/sjokoladekake-i-langpanne',
    historie: 'Lagret fra nettet i 2023 — lenker forsvinner, kaker består.',
  },
  ingredienser: [
    { id: 'egg', navn: 'egg', mengde: 2, enhet: 'stk', kommentar: null, gruppe: 'Kake' },
    { id: 'sukker', navn: 'sukker', mengde: 3, enhet: 'dl', kommentar: null, gruppe: 'Kake' },
    { id: 'hvetemel', navn: 'hvetemel', mengde: 4, enhet: 'dl', kommentar: null, gruppe: 'Kake' },
    { id: 'kakao', navn: 'kakao', mengde: 4, enhet: 'ss', kommentar: null, gruppe: 'Kake' },
    { id: 'bakepulver', navn: 'bakepulver', mengde: 2, enhet: 'ts', kommentar: null, gruppe: 'Kake' },
    { id: 'vanilje', navn: 'vaniljesukker', mengde: 2, enhet: 'ts', kommentar: null, gruppe: 'Kake' },
    { id: 'smor', navn: 'smør', mengde: 150, enhet: 'g', kommentar: 'smeltet', gruppe: 'Kake' },
    { id: 'melk', navn: 'melk', mengde: 1.5, enhet: 'dl', kommentar: null, gruppe: 'Kake' },
    { id: 'smor-glasur', navn: 'smør', mengde: 100, enhet: 'g', kommentar: null, gruppe: 'Glasur' },
    { id: 'melis', navn: 'melis', mengde: 3, enhet: 'dl', kommentar: null, gruppe: 'Glasur' },
    { id: 'kakao-glasur', navn: 'kakao', mengde: 3, enhet: 'ss', kommentar: null, gruppe: 'Glasur' },
    { id: 'kaffe', navn: 'sterk kald kaffe', mengde: 2, enhet: 'ss', kommentar: null, gruppe: 'Glasur' },
    { id: 'kokos', navn: 'kokosmasse', mengde: null, enhet: null, kommentar: 'til å strø over', gruppe: 'Glasur' },
  ],
  steg: [
    {
      id: 'eggedosis',
      tekst: 'Pisk egg og sukker til en luftig eggedosis — vispen skal sette spor.',
      ingredienser: ['egg', 'sukker'],
      passiv: null,
      imens: false,
    },
    {
      id: 'torrvarer',
      tekst: 'Sikt inn hvetemel, kakao, bakepulver og vaniljesukker, og vend forsiktig inn.',
      ingredienser: ['hvetemel', 'kakao', 'bakepulver', 'vanilje'],
      passiv: null,
      imens: false,
    },
    {
      id: 'vatvarer',
      tekst: 'Rør inn smeltet smør og melk til en jevn, blank røre. Hell i en smurt liten langpanne.',
      ingredienser: ['smor', 'melk'],
      passiv: null,
      imens: false,
    },
    {
      id: 'steking',
      tekst: 'Stek midt i ovnen til en kakepinne kommer ut tørr.',
      ingredienser: [],
      passiv: { hva: 'steking', minutter: 35 },
      imens: false,
    },
    {
      id: 'glasur',
      tekst: 'Smelt smøret og rør inn melis, kakao og kaffe til en blank glasur.',
      ingredienser: ['smor-glasur', 'melis', 'kakao-glasur', 'kaffe'],
      passiv: null,
      imens: true,
    },
    {
      id: 'avkjoling',
      tekst: 'La kaken avkjøles i formen.',
      ingredienser: [],
      passiv: { hva: 'avkjøling', minutter: 30 },
      imens: false,
    },
    {
      id: 'glaser',
      tekst: 'Hell glasuren over den avkjølte kaken, strø over kokos, og la den stivne før du skjærer ruter.',
      ingredienser: ['kokos'],
      passiv: null,
      imens: false,
    },
  ],
  ferdigprodukt: {
    bilder: [],
    tekst: 'Den klassiske langpannekaken — saftig nok til å spises rett fra formen i kjellerstua.',
  },
};

const pannekaker: RecipeContent = {
  info: {
    porsjoner: { antall: 4, benevnelse: 'porsjoner' },
    kanSkaleres: true,
    aktivTidMinutter: 30,
    totalTidMinutter: 60,
    stekeinfo: null,
  },
  opprinnelse: {
    type: 'person',
    navn: 'Mamma',
    url: null,
    historie: 'Lørdagsmiddagen da jeg var liten — alltid med blåbærsyltetøy og alltid én pannekake som ble ofret til pannen.',
  },
  ingredienser: [
    { id: 'hvetemel', navn: 'hvetemel', mengde: 3, enhet: 'dl', kommentar: null, gruppe: null },
    { id: 'salt', navn: 'salt', mengde: 0.5, enhet: 'ts', kommentar: null, gruppe: null },
    { id: 'melk', navn: 'melk', mengde: 5, enhet: 'dl', kommentar: null, gruppe: null },
    { id: 'egg', navn: 'egg', mengde: 3, enhet: 'stk', kommentar: null, gruppe: null },
    { id: 'smor', navn: 'smør', mengde: null, enhet: null, kommentar: 'til steking', gruppe: null },
  ],
  steg: [
    {
      id: 'rore',
      tekst: 'Visp sammen mel, salt og halvparten av melken til en klumpfri røre. Visp så inn resten av melken og eggene.',
      ingredienser: ['hvetemel', 'salt', 'melk', 'egg'],
      passiv: null,
      imens: false,
    },
    {
      id: 'svelling',
      tekst: 'La røra svelle — den blir tykkere og pannekakene blir seigere på den gode måten.',
      ingredienser: [],
      passiv: { hva: 'svelling', minutter: 30 },
      imens: false,
    },
    {
      id: 'stek',
      tekst: 'Stek tynne pannekaker i smør på middels varme. Snu når oversiden har stivnet og undersiden er gyllen.',
      ingredienser: ['smor'],
      passiv: null,
      imens: false,
    },
  ],
  ferdigprodukt: {
    bilder: [],
    tekst: 'Serveres i stabel med blåbærsyltetøy. Den første pannekaken teller ikke.',
  },
};

const focaccia: RecipeContent = {
  info: {
    porsjoner: { antall: 12, benevnelse: 'ruter' },
    kanSkaleres: true,
    aktivTidMinutter: 20,
    totalTidMinutter: 180,
    stekeinfo: { graderCelsius: 230, varme: 'varmluft', minutter: 20 },
  },
  opprinnelse: {
    type: 'bok',
    navn: '«Italia på kjøkkenbordet», s. 87',
    url: null,
    historie: null,
  },
  ingredienser: [
    { id: 'hvetemel', navn: 'hvetemel', mengde: 600, enhet: 'g', kommentar: null, gruppe: 'Deig' },
    { id: 'vann', navn: 'lunkent vann', mengde: 5, enhet: 'dl', kommentar: null, gruppe: 'Deig' },
    { id: 'gjar', navn: 'tørrgjær', mengde: 1, enhet: 'ts', kommentar: null, gruppe: 'Deig' },
    { id: 'salt', navn: 'salt', mengde: 2, enhet: 'ts', kommentar: null, gruppe: 'Deig' },
    { id: 'olje-deig', navn: 'olivenolje', mengde: 0.5, enhet: 'dl', kommentar: 'i deigen', gruppe: 'Deig' },
    { id: 'olje-topp', navn: 'olivenolje', mengde: 0.5, enhet: 'dl', kommentar: 'over før steking', gruppe: 'Topping' },
    { id: 'rosmarin', navn: 'frisk rosmarin', mengde: 2, enhet: 'ss', kommentar: null, gruppe: 'Topping' },
    { id: 'flaksalt', navn: 'flaksalt', mengde: 1, enhet: 'ts', kommentar: null, gruppe: 'Topping' },
  ],
  steg: [
    {
      id: 'bland',
      tekst: 'Rør sammen mel, gjær, salt, vann og olivenolje til en våt, slapp deig. Ikke elt — bare rør til alt er fuktet.',
      ingredienser: ['hvetemel', 'gjar', 'salt', 'vann', 'olje-deig'],
      passiv: null,
      imens: false,
    },
    {
      id: 'heving',
      tekst: 'Dekk bollen med plast og la deigen heve på benken. Den skal boble og dobles.',
      ingredienser: [],
      passiv: { hva: 'heving', minutter: 120 },
      imens: false,
    },
    {
      id: 'panne',
      tekst: 'Hell deigen ut i en oljet langpanne og dytt den forsiktig utover med oljete fingre. Lag dype groper med fingertuppene.',
      ingredienser: [],
      passiv: null,
      imens: false,
    },
    {
      id: 'topp',
      tekst: 'Drypp olivenolje over hele flaten, og strø på rosmarin og flaksalt.',
      ingredienser: ['olje-topp', 'rosmarin', 'flaksalt'],
      passiv: null,
      imens: false,
    },
    {
      id: 'steking',
      tekst: 'Stek til den er gyllen og sprø i kantene.',
      ingredienser: [],
      passiv: { hva: 'steking', minutter: 20 },
      imens: false,
    },
  ],
  ferdigprodukt: {
    bilder: [],
    tekst: 'Sprø bunn, myk midte, og groper fulle av olje og salt.',
  },
};

const fiskesuppe: RecipeContent = {
  info: {
    porsjoner: { antall: 4, benevnelse: 'porsjoner' },
    kanSkaleres: true,
    aktivTidMinutter: 35,
    totalTidMinutter: 35,
    stekeinfo: null,
  },
  opprinnelse: {
    type: 'person',
    navn: 'Pappa',
    url: null,
    historie: 'Pappas søndagssuppe. Han insisterer på at hemmeligheten er å ikke koke laksen, bare la den trekke.',
  },
  ingredienser: [
    { id: 'gulrot', navn: 'gulrøtter', mengde: 2, enhet: 'stk', kommentar: 'i tynne staver', gruppe: null },
    { id: 'purre', navn: 'purre', mengde: 1, enhet: 'stk', kommentar: 'i ringer', gruppe: null },
    { id: 'potet', navn: 'poteter', mengde: 4, enhet: 'stk', kommentar: 'i terninger', gruppe: null },
    { id: 'smor', navn: 'smør', mengde: 2, enhet: 'ss', kommentar: null, gruppe: null },
    { id: 'buljong', navn: 'fiskebuljong', mengde: 1, enhet: 'l', kommentar: null, gruppe: null },
    { id: 'flote', navn: 'fløte', mengde: 3, enhet: 'dl', kommentar: null, gruppe: null },
    { id: 'laks', navn: 'laksefilet', mengde: 400, enhet: 'g', kommentar: 'uten skinn, i biter', gruppe: null },
    { id: 'sitron', navn: 'sitron', mengde: 0.5, enhet: 'stk', kommentar: 'saften', gruppe: null },
    { id: 'krydder', navn: 'salt og hvit pepper', mengde: null, enhet: null, kommentar: 'etter smak', gruppe: null },
  ],
  steg: [
    {
      id: 'surr',
      tekst: 'Surr gulrot, purre og potet i smør i en romslig gryte til purren er blank, uten å ta farge.',
      ingredienser: ['gulrot', 'purre', 'potet', 'smor'],
      passiv: null,
      imens: false,
    },
    {
      id: 'kok',
      tekst: 'Hell på buljongen og la det småkoke til potetene er møre, et kvarters tid.',
      ingredienser: ['buljong'],
      passiv: null,
      imens: false,
    },
    {
      id: 'flote',
      tekst: 'Hell i fløten og la suppen få et oppkok.',
      ingredienser: ['flote'],
      passiv: null,
      imens: false,
    },
    {
      id: 'trekk',
      tekst: 'Trekk gryten av platen og legg i laksebitene. La dem trekke til de så vidt er gjennomvarme — de skal ikke koke.',
      ingredienser: ['laks'],
      passiv: null,
      imens: false,
    },
    {
      id: 'smak',
      tekst: 'Smak til med sitron, salt og hvit pepper.',
      ingredienser: ['sitron', 'krydder'],
      passiv: null,
      imens: false,
    },
  ],
  ferdigprodukt: {
    bilder: [],
    tekst: 'Serveres med grovbrød og godt smør.',
  },
};

const vaniljekrem: RecipeContent = {
  info: {
    porsjoner: { antall: 6, benevnelse: 'dl krem' },
    kanSkaleres: true,
    aktivTidMinutter: 15,
    totalTidMinutter: 75,
    stekeinfo: null,
  },
  opprinnelse: {
    type: 'egen',
    navn: 'husets standard',
    url: null,
    historie: 'Grunnoppskriften alt det gode fylles med.',
  },
  ingredienser: [
    { id: 'melk', navn: 'helmelk', mengde: 5, enhet: 'dl', kommentar: null, gruppe: null },
    { id: 'vaniljestang', navn: 'vaniljestang', mengde: 1, enhet: 'stk', kommentar: 'delt på langs', gruppe: null },
    { id: 'eggeplommer', navn: 'eggeplommer', mengde: 4, enhet: 'stk', kommentar: null, gruppe: null },
    { id: 'sukker', navn: 'sukker', mengde: 1, enhet: 'dl', kommentar: null, gruppe: null },
    { id: 'maisenna', navn: 'maisenna', mengde: 3, enhet: 'ss', kommentar: null, gruppe: null },
  ],
  steg: [
    {
      id: 'varm',
      tekst: 'Varm melken med vaniljestangen til den så vidt damper.',
      ingredienser: ['melk', 'vaniljestang'],
      passiv: null,
      imens: false,
    },
    {
      id: 'visp',
      tekst: 'Visp eggeplommer, sukker og maisenna sammen i en bolle.',
      ingredienser: ['eggeplommer', 'sukker', 'maisenna'],
      passiv: null,
      imens: false,
    },
    {
      id: 'temperer',
      tekst: 'Hell den varme melken i eggeblandingen i en tynn stråle mens du visper. Tilbake i kjelen, og varm på svak varme til kremen tykner — den må ikke koke.',
      ingredienser: [],
      passiv: null,
      imens: false,
    },
    {
      id: 'avkjoling',
      tekst: 'Avkjøl helt under plast som ligger rett på kremen, så det ikke dannes snerk.',
      ingredienser: [],
      passiv: { hva: 'avkjøling', minutter: 60 },
      imens: false,
    },
  ],
  ferdigprodukt: {
    bilder: [],
    tekst: 'Tykk, blank og full av vaniljefrø.',
  },
};

const skoleboller: RecipeContent = {
  info: {
    porsjoner: { antall: 12, benevnelse: 'boller' },
    kanSkaleres: true,
    aktivTidMinutter: 45,
    totalTidMinutter: 160,
    stekeinfo: { graderCelsius: 220, varme: 'over_under', minutter: 10 },
  },
  opprinnelse: {
    type: 'person',
    navn: 'Maren selv',
    url: null,
    historie: 'Samme deig som mormors skillingsboller — men med vaniljekrem og kokos, slik de skal være.',
  },
  ingredienser: [
    { id: 'hvetebolledeig', navn: 'hvetebolledeig', mengde: 1, enhet: 'stk', kommentar: 'som til skillingsbollene, hele satsen', gruppe: 'Boller' },
    { id: 'vaniljekrem', navn: 'vaniljekrem', mengde: 3, enhet: 'dl', kommentar: 'se egen oppskrift', gruppe: 'Boller' },
    { id: 'egg', navn: 'egg', mengde: 1, enhet: 'stk', kommentar: 'til pensling', gruppe: 'Boller' },
    { id: 'melis', navn: 'melis', mengde: 2, enhet: 'dl', kommentar: null, gruppe: 'Glasur' },
    { id: 'vann', navn: 'vann', mengde: 2, enhet: 'ss', kommentar: null, gruppe: 'Glasur' },
    { id: 'kokos', navn: 'kokosmasse', mengde: 2, enhet: 'dl', kommentar: null, gruppe: 'Glasur' },
  ],
  steg: [
    {
      id: 'boller',
      tekst: 'Trill deigen til tolv jevne boller og legg dem på brett. La dem etterheve under et klede.',
      ingredienser: ['hvetebolledeig'],
      passiv: { hva: 'etterheving', minutter: 40 },
      imens: false,
    },
    {
      id: 'fyll',
      tekst: 'Trykk en dyp grop i hver bolle og fyll med en stor klatt vaniljekrem. Pensle kantene med egg.',
      ingredienser: ['vaniljekrem', 'egg'],
      passiv: null,
      imens: false,
    },
    {
      id: 'steking',
      tekst: 'Stek midt i ovnen til gylne.',
      ingredienser: [],
      passiv: { hva: 'steking', minutter: 10 },
      imens: false,
    },
    {
      id: 'glasur',
      tekst: 'Rør melis og vann til en tykk glasur.',
      ingredienser: ['melis', 'vann'],
      passiv: null,
      imens: true,
    },
    {
      id: 'pynt',
      tekst: 'Pensle de avkjølte bollene med glasur rundt kremen og dypp i kokos.',
      ingredienser: ['kokos'],
      passiv: null,
      imens: false,
    },
  ],
  ferdigprodukt: {
    bilder: [],
    tekst: 'Skolegårdens gullstandard.',
  },
};

async function seed() {
  const { db } = await import('@/lib/db');
  const { cookbook, chapters, recipes, recipeChapters, recipeNotes, recipeShares, recipeLinks, users, recipeContentSchema } = await import('@/lib/db/schema');

  console.log('🌱 Seeding database...');

  await db.transaction(async (tx) => {
    console.log('🧹 Cleaning existing data...');
    await tx.delete(cookbook);
    await tx.delete(recipes);

    // Seed-brukeren (CLAUDE.md sin test-bruker) — må finnes for FK-ene.
    await tx
      .insert(users)
      .values({ id: USER_ID, name: 'Maren', email: 'maren@kokekompis.no' })
      .onConflictDoNothing();

    // utstilt: showcase-boken som møter utloggede gjester på forsiden
    const [marensKokebok] = await tx
      .insert(cookbook)
      .values({
        userId: USER_ID,
        name: 'Marens kokebok',
        synlighet: 'utstilt',
        farge: 'terra',
        headerBilde: 'striper',
        beskrivelse: 'Alt mormor aldri målte opp — samlet, prøvd og rettet.',
        skisse: 'bolle',
      })
      .returning();

    const allChapters = await tx
      .insert(chapters)
      .values([
        { cookbookId: marensKokebok.id, name: 'Gjærbakst', order: 1 },
        { cookbookId: marensKokebok.id, name: 'Kaker', order: 2 },
        { cookbookId: marensKokebok.id, name: 'Middag', order: 3 },
      ])
      .returning();

    const [gjaerbakst, kaker, middag] = allChapters;
    console.log('📖 Created chapters:', allChapters.map((c) => c.name));

    // Valider innholdet mot skjemaet allerede her — et seed-innhold som ikke parser er en bug nå,
    // ikke når siden først leser raden. Vaniljekremen legges bevisst UTEN kapittel (ukategorisert).
    const innhold = [
      { title: 'Mormors skillingsboller', description: 'Myke kanelboller slik mormor lagde dem — tunge av kardemomme og kanel.', content: skillingsboller },
      { title: 'Sjokoladekake i langpanne', description: 'Den saftige klassikeren med blank kakaoglasur og kokos.', content: sjokoladekake },
      { title: 'Mammas pannekaker', description: 'Tynne pannekaker med svellet røre, akkurat som på lørdagene hjemme.', content: pannekaker },
      { title: 'Focaccia med rosmarin', description: 'Italiensk langpannebrød med dype oljegroper og flaksalt.', content: focaccia },
      { title: 'Pappas fiskesuppe', description: 'Kremet suppe der laksen trekker, aldri koker.', content: fiskesuppe },
      { title: 'Skoleboller', description: 'Hvetebolle, vaniljekrem, glasur og kokos — i riktig rekkefølge.', content: skoleboller },
      { title: 'Vaniljekrem', description: 'Grunnoppskriften — til skoleboller, berlinerboller og skje.', content: vaniljekrem },
    ].map((r) => ({ ...r, userId: USER_ID, cookbookId: marensKokebok.id, content: recipeContentSchema.parse(r.content) }));

    const allRecipes = await tx.insert(recipes).values(innhold).returning();
    console.log('🍳 Created recipes:', allRecipes.map((r) => r.title));

    const [boller, kake, pannekakeRad, focacciaRad, suppe, skolebolleRad, vaniljekremRad] = allRecipes;

    await tx.insert(recipeChapters).values([
      { recipeId: boller.id, chapterId: gjaerbakst.id, order: 1 },
      { recipeId: focacciaRad.id, chapterId: gjaerbakst.id, order: 2 },
      { recipeId: skolebolleRad.id, chapterId: gjaerbakst.id, order: 3 },
      { recipeId: kake.id, chapterId: kaker.id, order: 1 },
      { recipeId: pannekakeRad.id, chapterId: middag.id, order: 1 },
      { recipeId: suppe.id, chapterId: middag.id, order: 2 },
    ]);

    // Skolebollen peker på vaniljekremen — hopp dit og tilbake uten å miste stedet sitt.
    await tx.insert(recipeLinks).values([
      { fromRecipeId: skolebolleRad.id, toRecipeId: vaniljekremRad.id },
    ]);

    // Et par lapper på bollene + en delingslenke på kaken, så alle visningene har noe å vise.
    await tx.insert(recipeNotes).values([
      { recipeId: boller.id, userId: USER_ID, tekst: 'Mormor brukte alltid litt mer kanel — gjør det.', farge: 'rav' },
      { recipeId: boller.id, userId: USER_ID, tekst: 'Prøvd med 11 min i steketid — perfekt i vår ovn.', farge: 'terrakotta' },
    ]);
    await tx.insert(recipeShares).values([{ recipeId: kake.id }]);

    console.log('🔗 Linked recipes, notes and a share');
  });

  console.log('✅ Seeding complete!');

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
