'use server';

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { eq, and, asc, max, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { chapters, cookbook, recipes, recipeChapters } from '@/lib/db/schema';
import { withTransaction } from '@/lib/db-tx';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { parseUuidParam } from '@/lib/uuid/uuid-base32';
import { ekstraherFraBilde, ekstraherFraTekst, tilRecipeContent, ImportFeil, type EkstrahertOppskrift } from '@/lib/ai/ekstraher-oppskrift';
import { log, Attr } from '@/lib/log';

// Importflyten: hent kilden (nettside eller foto), la AI-en strukturere den, lagre i valgt
// kapittel og hopp rett til den ferdige oppskriften. Feil sendes tilbake til importsiden som
// ?feil=… — ren URL-state, ingen klient-JS.

const MAKS_BILDE_BYTES = 8 * 1024 * 1024;

function tilbakeMedFeil(cookbookId: string, melding: string): never {
  redirect(`${uuidHref`/kokebok/${cookbookId}/importer`}?feil=${encodeURIComponent(melding)}`);
}

// Lenken brukeren limer inn er utrustet input som går rett i en server-side fetch — slipp bare
// gjennom offentlige http(s)-verter.
function validerKildeUrl(råUrl: string): URL | null {
  const url = z.string().url().safeParse(råUrl);
  if (!url.success) return null;

  const parsed = new URL(url.data);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|\[)/.test(parsed.hostname)) return null;

  return parsed;
}

// Grovrensing av HTML til tekst for modellen: vekk med script/style, tagger blir mellomrom,
// de vanligste entitetene dekodes. Trenger ikke være pent — bare lesbart.
function htmlTilTekst(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function lagreOppskrift(
  cookbookId: string,
  kapittelId: string | null,
  userId: string,
  ekstrahert: EkstrahertOppskrift,
  kilde: 'url' | 'bilde',
): Promise<string> {
  return withTransaction({ name: 'oppskrift.importer' }, async (tx) => {
    if (kapittelId) {
      // kapittelet må høre til boken — skjemaverdier er utrustet input
      const kapittel = await tx
        .select({ id: chapters.id })
        .from(chapters)
        .where(and(eq(chapters.id, kapittelId), eq(chapters.cookbookId, cookbookId)))
        .maybeSingle('importer.kapittel');
      if (!kapittel) tilbakeMedFeil(cookbookId, 'Velg et kapittel i denne boken');
    }

    // to samtidige importer av samme lenke deler ett AI-kall (in-flight-dedup i ai-laget), men
    // begge når hit — lagringen må selv være idempotent på kilde-URL så boken ikke får dubletter
    if (ekstrahert.opprinnelse?.url) {
      const eksisterende = await tx
        .select({ id: recipes.id })
        .from(recipes)
        .where(and(
          eq(recipes.cookbookId, cookbookId),
          sql`${recipes.content}->'opprinnelse'->>'url' = ${ekstrahert.opprinnelse.url}`,
        ))
        .orderBy(asc(recipes.title))
        .maybeFirst('importer.allerede-i-tx');
      if (eksisterende) return eksisterende.id;
    }

    const oppskrift = await tx
      .insert(recipes)
      .values({
        userId,
        cookbookId,
        title: ekstrahert.tittel,
        description: ekstrahert.beskrivelse,
        content: tilRecipeContent(ekstrahert),
      })
      .returning({ id: recipes.id })
      .single('importer.insert');

    if (kapittelId) {
      const { høyeste } = await tx
        .select({ høyeste: max(recipeChapters.order) })
        .from(recipeChapters)
        .where(eq(recipeChapters.chapterId, kapittelId))
        .single('importer.makskorder');

      await tx.insert(recipeChapters).values({
        recipeId: oppskrift.id,
        chapterId: kapittelId,
        order: (høyeste ?? 0) + 1,
      });
    }

    log.info(oppskrift.id, Attr.RECIPE_IMPORTED, { kilde, tittel: ekstrahert.tittel });

    return oppskrift.id;
  });
}

// "ingen" = ukategorisert; ellers en (base32-)uuid for et kapittel. null-retur = ugyldig input.
function lesKapittelValg(formData: FormData): { kapittelId: string | null } | null {
  const valg = String(formData.get('kapittel') ?? '');
  if (valg === 'ingen') return { kapittelId: null };

  const kapittelId = parseUuidParam(valg);
  if (!kapittelId) return null;

  return { kapittelId };
}

export async function importerFraUrl(cookbookId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) tilbakeMedFeil(cookbookId, 'Du må være logget inn for å importere');

  // import endrer boken — den må være din (en fremmed bok-id ender bare på forsiden)
  const minBok = await db
    .select({ id: cookbook.id })
    .from(cookbook)
    .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
    .exists();
  if (!minBok) redirect('/');

  const valg = lesKapittelValg(formData);
  if (!valg) tilbakeMedFeil(cookbookId, 'Velg et kapittel');

  const kildeUrl = validerKildeUrl(String(formData.get('url') ?? ''));
  if (!kildeUrl) tilbakeMedFeil(cookbookId, 'Det der ser ikke ut som en nettadresse');

  // står lenken alt i boken? da er importen idempotent — hopp dit i stedet for å svi tokener
  const alleredeImportert = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(
      eq(recipes.cookbookId, cookbookId),
      sql`${recipes.content}->'opprinnelse'->>'url' = ${kildeUrl.toString()}`,
    ))
    .orderBy(asc(recipes.title))
    .maybeFirst('importer.allerede');
  if (alleredeImportert) redirect(uuidHref`/kokebok/${cookbookId}/oppskrift/${alleredeImportert.id}`);

  let ekstrahert: EkstrahertOppskrift;
  let modell: string;
  let latencyMs: number;
  try {
    const side = await fetch(kildeUrl, { headers: { 'User-Agent': 'Kokekompis/1.0 (+oppskriftsimport)' } });
    if (!side.ok) tilbakeMedFeil(cookbookId, `Fikk ikke hentet siden (${side.status})`);

    const resultat = await ekstraherFraTekst(htmlTilTekst(await side.text()), kildeUrl.toString());
    ({ oppskrift: ekstrahert, modell, latencyMs } = resultat);
  } catch (err) {
    if (err instanceof ImportFeil) {
      log.warn('import.url-failed', err.message, { url: kildeUrl.toString() });
      tilbakeMedFeil(cookbookId, err.message);
    }

    throw err;
  }

  const recipeId = await lagreOppskrift(cookbookId, valg.kapittelId, userId, ekstrahert, 'url');

  log.info(recipeId, Attr.IMPORT_MODEL, modell);
  log.info(recipeId, Attr.IMPORT_LATENCY_MS, latencyMs);
  redirect(uuidHref`/kokebok/${cookbookId}/oppskrift/${recipeId}`);
}

export async function importerFraBilde(cookbookId: string, formData: FormData) {
  const userId = await getCurrentUserId();
  if (!userId) tilbakeMedFeil(cookbookId, 'Du må være logget inn for å importere');

  const minBok = await db
    .select({ id: cookbook.id })
    .from(cookbook)
    .where(and(eq(cookbook.id, cookbookId), eq(cookbook.userId, userId)))
    .exists();
  if (!minBok) redirect('/');

  const valg = lesKapittelValg(formData);
  if (!valg) tilbakeMedFeil(cookbookId, 'Velg et kapittel');

  const bilde = formData.get('bilde');
  if (!(bilde instanceof File) || bilde.size === 0) tilbakeMedFeil(cookbookId, 'Velg et bilde av oppskriften');
  if (!bilde.type.startsWith('image/'))             tilbakeMedFeil(cookbookId, 'Filen må være et bilde');
  if (bilde.size > MAKS_BILDE_BYTES)                tilbakeMedFeil(cookbookId, 'Bildet er for stort (maks 8 MB)');

  const bytes = Buffer.from(await bilde.arrayBuffer());
  const dataUrl = `data:${bilde.type};base64,${bytes.toString('base64')}`;
  const bildeHash = createHash('sha256').update(bytes).digest('hex');

  let ekstrahert: EkstrahertOppskrift;
  let modell: string;
  let latencyMs: number;
  try {
    ({ oppskrift: ekstrahert, modell, latencyMs } = await ekstraherFraBilde(dataUrl, bildeHash));
  } catch (err) {
    if (err instanceof ImportFeil) {
      log.warn('import.bilde-failed', err.message, { størrelse: bilde.size });
      tilbakeMedFeil(cookbookId, err.message);
    }

    throw err;
  }

  const recipeId = await lagreOppskrift(cookbookId, valg.kapittelId, userId, ekstrahert, 'bilde');

  log.info(recipeId, Attr.IMPORT_MODEL, modell);
  log.info(recipeId, Attr.IMPORT_LATENCY_MS, latencyMs);
  redirect(uuidHref`/kokebok/${cookbookId}/oppskrift/${recipeId}`);
}
