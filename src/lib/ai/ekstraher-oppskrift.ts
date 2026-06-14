import 'server-only';
import { z } from 'zod';
import { recipeContentSchema, enheter, type RecipeContent } from '@/lib/db/schema';
import { nowMs } from '@/lib/clock';

// AI-ekstraksjon av oppskrifter: fra en nettside (lenker råtner — vi henter innholdet HER og NÅ og
// putter det i VÅRT system) eller fra et bilde av en fysisk oppskrift (kokebokside, mormors kort).
// OpenAI Responses API med strengt JSON-skjema; svaret valideres med zod før det slipper inn.

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_DEFAULT_MODEL = 'gpt-5-mini';
const OPENAI_TIMEOUT_MS = 90_000;
const MAKS_TEKST_TEGN = 30_000;

export class ImportFeil extends Error {}

// Det modellen skal levere: innholdet minus ferdigprodukt (det er ditt, ikke kildens) pluss
// tittel/beskrivelse som lever som egne kolonner på oppskriften.
export type EkstrahertOppskrift = z.infer<typeof ekstrahertOppskriftSchema>;
export const ekstrahertOppskriftSchema = recipeContentSchema.omit({ ferdigprodukt: true }).extend({
  tittel: z.string().min(1),
  beskrivelse: z.string().nullable(),
});

const SYSTEM_PROMPT = `Du er Kokekompis' oppskriftsleser. Du får en oppskrift som tekst fra en nettside eller som et fotografi (håndskrevet kort, kokebokside, utskrift), og skal strukturere den — på norsk bokmål — etter JSON-skjemaet.

Regler:
- BEVAR originalens mengder og enheter nøyaktig ("9 dl mel" forblir 9 dl — aldri konverter).
- Hver ingrediens får en stabil slug-id (a-z, 0-9, bindestrek). Bruk "gruppe" når oppskriften selv deler ingrediensene inn (f.eks. "Deig", "Fyll"); ellers null.
- Stegene: kort og klar instruks UTEN mengder i teksten ("pisk egg og sukker", ikke "pisk 2 egg og 3 dl sukker") — mengdene flettes inn via "ingredienser", som lister id-ene til ingrediensene steget bruker.
- Ventesteg (heving, steking i ovn, avkjøling, hviling) får "passiv" satt med hva det er og antall minutter (null hvis ukjent). Aktive steg har passiv: null.
- "imens": true på steg som kan gjøres MENS forrige venting pågår (lage fyll mens deigen hever). Vær konservativ — bare når det åpenbart ikke avhenger av ventingens resultat.
- "totalTidMinutter" er fra start til spiseklart (inkluder heving/avkjøling); null hvis det ikke kan leses ut. "aktivTidMinutter" er hendene-i-bollen-tid.
- "opprinnelse": kildens navn hvis den fremgår (bloggens/nettstedets navn, "Mormor" på et håndskrevet kort, bokens tittel). null hvis ukjent.
- Teksten kan være full av rot rundt selve oppskriften — meny, reklame, informasjonskapsel-bannere, nyhetsbrev-bokser, kommentarfelt, "andre oppskrifter du kanskje liker", deleknapper, bunntekst. Plukk ut DEN oppskriften siden handler om og se bort fra alt det andre. Er det flere likeverdige oppskrifter, ta hovedoppskriften siden er bygd rundt.
- Ikke dikt opp noe som ikke står i kilden. Er bildet/teksten ikke en oppskrift, gjør ditt beste med det som finnes.`;

// Håndskrevet speil av ekstrahertOppskriftSchema for OpenAIs strict-modus (alle felt required,
// additionalProperties: false, null via anyOf). Endres skjemaet i schema.ts, endres dette.
const OPPSKRIFT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tittel', 'beskrivelse', 'info', 'opprinnelse', 'ingredienser', 'steg'],
  properties: {
    tittel:       { type: 'string' },
    beskrivelse:  { type: ['string', 'null'] },
    info: {
      type: 'object',
      additionalProperties: false,
      required: ['porsjoner', 'aktivTidMinutter', 'totalTidMinutter', 'stekeinfo'],
      properties: {
        porsjoner: {
          type: 'object',
          additionalProperties: false,
          required: ['antall', 'benevnelse'],
          properties: { antall: { type: 'number' }, benevnelse: { type: 'string' } },
        },
        aktivTidMinutter: { type: ['number', 'null'] },
        totalTidMinutter: { type: ['number', 'null'] },
        stekeinfo: {
          anyOf: [
            { type: 'null' },
            {
              type: 'object',
              additionalProperties: false,
              required: ['graderCelsius', 'varme', 'minutter'],
              properties: {
                graderCelsius: { type: 'number' },
                varme:         { anyOf: [{ type: 'null' }, { type: 'string', enum: ['over_under', 'varmluft', 'grill'] }] },
                minutter:      { type: 'number' },
              },
            },
          ],
        },
      },
    },
    opprinnelse: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'navn', 'url', 'historie'],
          properties: {
            type:     { type: 'string', enum: ['person', 'nettside', 'bok', 'blad', 'egen', 'annet'] },
            navn:     { type: 'string' },
            url:      { type: ['string', 'null'] },
            historie: { type: ['string', 'null'] },
          },
        },
      ],
    },
    ingredienser: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'navn', 'mengde', 'enhet', 'kommentar', 'gruppe'],
        properties: {
          id:        { type: 'string' },
          navn:      { type: 'string' },
          mengde:    { type: ['number', 'null'] },
          enhet:     { anyOf: [{ type: 'null' }, { type: 'string', enum: [...enheter] }] },
          kommentar: { type: ['string', 'null'] },
          gruppe:    { type: ['string', 'null'] },
        },
      },
    },
    steg: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'tekst', 'ingredienser', 'passiv', 'imens'],
        properties: {
          id:           { type: 'string' },
          tekst:        { type: 'string' },
          ingredienser: { type: 'array', items: { type: 'string' } },
          passiv: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object',
                additionalProperties: false,
                required: ['hva', 'minutter'],
                properties: { hva: { type: 'string' }, minutter: { type: ['number', 'null'] } },
              },
            ],
          },
          imens: { type: 'boolean' },
        },
      },
    },
  },
} as const;

type BrukerInnhold =
  | string
  | Array<{ type: 'input_text'; text: string } | { type: 'input_image'; image_url: string }>;

// In-flight-dedup per kilde: et utålmodig dobbeltklikk (eller to faner) på samme lenke/bilde skal
// dele ETT OpenAI-kall, ikke svi tokener to ganger. Nøkkelen er kilde-URL-en eller bildehashen;
// promiset ryddes når kallet er ferdig, så en bevisst re-import senere går gjennom.
const pågående = new Map<string, Promise<EkstraksjonsResultat>>();

type EkstraksjonsResultat = { oppskrift: EkstrahertOppskrift; modell: string; latencyMs: number };

function medInFlightDedup(nøkkel: string, fn: () => Promise<EkstraksjonsResultat>): Promise<EkstraksjonsResultat> {
  const eksisterende = pågående.get(nøkkel);
  if (eksisterende) return eksisterende;

  const promise = fn().finally(() => pågående.delete(nøkkel));
  pågående.set(nøkkel, promise);

  return promise;
}

async function kallOpenAI(brukerInnhold: BrukerInnhold): Promise<{ oppskrift: EkstrahertOppskrift; modell: string; latencyMs: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ImportFeil('OPENAI_API_KEY er ikke satt — AI-import er ikke konfigurert');

  const modell = process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL;
  const startMs = nowMs();

  // gpt-5-familien styres med reasoning-effort; eldre modeller kjenner ikke parameteren
  const reasoning = modell.startsWith('gpt-5') ? { reasoning: { effort: 'low' } } : {};

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modell,
        max_output_tokens: 16_000,
        ...reasoning,
        input: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: brukerInnhold },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'kokekompis_oppskrift',
            strict: true,
            schema: OPPSKRIFT_JSON_SCHEMA,
          },
        },
      }),
    });
  } catch (err) {
    if (controller.signal.aborted) throw new ImportFeil(`OpenAI svarte ikke innen ${OPENAI_TIMEOUT_MS / 1000} sekunder`);

    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const detalj = await res.text().catch(() => '');
    throw new ImportFeil(`OpenAI svarte ${res.status}: ${detalj.slice(0, 300)}`);
  }

  const data: unknown = await res.json();
  const tekst = hentSvarTekst(data);
  if (!tekst) throw new ImportFeil('OpenAI-svaret manglet tekstinnhold');

  const parsed = ekstrahertOppskriftSchema.safeParse(JSON.parse(tekst));
  if (!parsed.success) throw new ImportFeil(`AI-svaret validerte ikke: ${parsed.error.issues[0]?.message ?? 'ukjent felt'}`);

  return { oppskrift: parsed.data, modell, latencyMs: nowMs() - startMs };
}

// Responses-API-et legger teksten i output[] (message → content → output_text); SDK-er aggregerer
// den som output_text. Godta begge — svaret er utrygt uansett og valideres med zod etterpå.
function hentSvarTekst(data: unknown): string | null {
  const svar = z.object({
    output_text: z.string().optional(),
    output: z.array(z.object({
      type: z.string(),
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    })).optional(),
  }).safeParse(data);
  if (!svar.success) return null;

  if (svar.data.output_text) return svar.data.output_text;

  for (const item of svar.data.output ?? []) {
    if (item.type !== 'message') continue;

    const del = item.content?.find((c) => c.type === 'output_text' && c.text);
    if (del?.text) return del.text;
  }

  return null;
}

// Innholdet slik det lagres: ekstraksjonen + tomt ferdigprodukt (det fylles av kokken, ikke kilden).
export function tilRecipeContent(ekstrahert: EkstrahertOppskrift): RecipeContent {
  const { tittel, beskrivelse, ...content } = ekstrahert;
  void tittel; void beskrivelse;

  return { ...content, ferdigprodukt: { bilder: [], tekst: null } };
}

export async function ekstraherFraTekst(tekst: string, kildeUrl: string) {
  return medInFlightDedup(kildeUrl, async () => {
    const avkortet = tekst.slice(0, MAKS_TEKST_TEGN);

    const resultat = await kallOpenAI(`Kilde-URL: ${kildeUrl}\n\nInnhold fra siden:\n\n${avkortet}`);

    // Nettkilde: opprinnelsen skal alltid peke på der den ble hentet — det er hele poenget med å
    // hente innholdet inn NÅ. Modellens navn beholdes når den fant et («Det søte liv»).
    const navn = resultat.oppskrift.opprinnelse?.navn || new URL(kildeUrl).hostname.replace(/^www\./, '');
    resultat.oppskrift.opprinnelse = {
      type: 'nettside',
      navn,
      url: kildeUrl,
      historie: resultat.oppskrift.opprinnelse?.historie ?? null,
    };

    return resultat;
  });
}

export async function ekstraherFraBilde(bildeDataUrl: string, dedupNøkkel: string) {
  return medInFlightDedup(`bilde:${dedupNøkkel}`, () => kallOpenAI([
    { type: 'input_text', text: 'Strukturer oppskriften på dette bildet.' },
    { type: 'input_image', image_url: bildeDataUrl },
  ]));
}

// Innlimt tekst: brukeren har som regel kopiert hele siden (Ctrl/Cmd+A) fordi lenken ikke lot seg
// hente — JS-rendrede sider, innlogging, paywall. Vi har ingen kilde-URL å tvinge opprinnelsen mot;
// modellen leser den ut av teksten selv hvis den står der. Dedup-nøkkelen er en hash av teksten.
export async function ekstraherFraLimtTekst(tekst: string, dedupNøkkel: string) {
  return medInFlightDedup(`tekst:${dedupNøkkel}`, () => {
    const avkortet = tekst.slice(0, MAKS_TEKST_TEGN);

    return kallOpenAI(`Brukeren har limt inn tekst — som regel hele nettsiden kopiert (Ctrl/Cmd+A), fordi lenken ikke lot seg hente automatisk. Finn oppskriften i rotet og strukturer bare den.\n\nInnlimt tekst:\n\n${avkortet}`);
  });
}
