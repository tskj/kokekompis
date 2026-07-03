'use client';

import { useState } from 'react';
import { endreKapittelNavn, flyttKapittel, flyttKapittelTilBok, flyttOppskriftIKapittel, type Retning } from '@/app/actions/kapittel';
import { flyttOppskrift } from '@/app/actions/organisering';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { useRecipeId } from '@/hooks/useUuidParams';
import Link from 'next/link';
import { LukkbarDetails } from '@/components/LukkbarDetails';

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  order?: number | null;
}

interface Chapter {
  id: string;
  name: string;
  order: number;
  recipes: Recipe[];
}

interface Bok {
  id: string;
  name: string;
}

// Eierens små piler på hver oppskriftslinje — sorteringen i boka skal være konstant
// tilgjengelig. Flatene er fingervennlige (min. 32 px) — mindre traff ingen på mobil.
function OppskriftPil({ chapterId, recipe, retning }: { chapterId: string; recipe: Recipe; retning: Retning }) {
  return (
    <form action={flyttOppskriftIKapittel.bind(null, chapterId, recipe.id, retning)}>
      <button
        type="submit"
        aria-label={`Flytt ${recipe.title} ${retning}`}
        title={retning === 'opp' ? 'Flytt oppskriften opp' : 'Flytt oppskriften ned'}
        className="flex size-8 items-center justify-center rounded-full text-sm text-ink/40 hover:bg-ink/5 hover:text-terra"
      >
        {retning === 'opp' ? '↑' : '↓'}
      </button>
    </form>
  );
}

// Flytting bor her, hos kapitlene — til et annet kapittel, ut av alle, eller til en annen bok.
function FlyttTilKapittel({ recipe, gjeldendeKapittelId, kapitler, andreBøker }: { recipe: Recipe; gjeldendeKapittelId: string | null; kapitler: Chapter[]; andreBøker: Bok[] }) {
  return (
    <LukkbarDetails className="relative">
      <summary
        className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full text-sm text-ink/40 hover:bg-ink/5 hover:text-terra"
        title={`Flytt ${recipe.title} til et annet kapittel eller en annen bok`}
        aria-label={`Flytt ${recipe.title} til et annet kapittel eller en annen bok`}
      >
        ⇄
      </summary>

      <form action={flyttOppskrift.bind(null, recipe.id)} className="absolute right-0 z-10 mt-1 flex w-52 flex-col gap-2 rounded-xl border border-line bg-card p-3 shadow-bok">
        <select
          name="kapittel"
          defaultValue={gjeldendeKapittelId ? encodeUuidToBase32(gjeldendeKapittelId) : 'ingen'}
          aria-label={`Hvor skal ${recipe.title} stå?`}
          className="rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
        >
          <optgroup label="I denne boken">
            {kapitler.map((kapittel) => (
              <option key={kapittel.id} value={encodeUuidToBase32(kapittel.id)}>{kapittel.name}</option>
            ))}
            <option value="ingen">Ukategorisert</option>
          </optgroup>
          {andreBøker.length > 0 && (
            <optgroup label="Til en annen bok">
              {andreBøker.map((bok) => (
                <option key={bok.id} value={`bok:${encodeUuidToBase32(bok.id)}`}>{bok.name}</option>
              ))}
            </optgroup>
          )}
        </select>
        <button type="submit" className="self-start rounded-full bg-terra px-3 py-1 text-sm font-medium text-paper hover:bg-terra-deep">
          Flytt
        </button>
      </form>
    </LukkbarDetails>
  );
}

// Kapittel-stellet: bytte plass, døpe om seksjonsoverskriften, flytte kapittelet til en annen bok.
function KapittelStell({ chapter, andreBøker }: { chapter: Chapter; andreBøker: Bok[] }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
      <form action={flyttKapittel.bind(null, chapter.id, 'opp')}>
        <button type="submit" aria-label={`Flytt ${chapter.name} opp`} title="Flytt kapittelet opp" className="rounded border border-line px-1.5 py-0.5 hover:border-terra hover:text-terra">
          ↑
        </button>
      </form>
      <form action={flyttKapittel.bind(null, chapter.id, 'ned')}>
        <button type="submit" aria-label={`Flytt ${chapter.name} ned`} title="Flytt kapittelet ned" className="rounded border border-line px-1.5 py-0.5 hover:border-terra hover:text-terra">
          ↓
        </button>
      </form>

      <LukkbarDetails className="relative">
        <summary className="cursor-pointer list-none hover:text-terra">✎ endre navn</summary>
        <form action={endreKapittelNavn.bind(null, chapter.id)} className="absolute z-10 mt-1 flex items-center gap-1 rounded-lg border border-line bg-card p-2 shadow-bok">
          <input
            name="navn"
            required
            maxLength={100}
            defaultValue={chapter.name}
            aria-label="Nytt kapittelnavn"
            className="w-36 rounded border border-line bg-paper px-2 py-1 focus:border-terra focus:outline-none"
          />
          <button type="submit" className="rounded-full border border-line px-2 py-1 hover:border-terra hover:text-terra">
            Lagre
          </button>
        </form>
      </LukkbarDetails>

      {andreBøker.length > 0 && (
        <LukkbarDetails className="relative">
          <summary className="cursor-pointer list-none hover:text-terra">flytt til bok …</summary>
          <form action={flyttKapittelTilBok.bind(null, chapter.id)} className="absolute z-10 mt-1 flex items-center gap-1 rounded-lg border border-line bg-card p-2 shadow-bok">
            <select name="bok" required aria-label="Bok å flytte kapittelet til" className="max-w-40 rounded border border-line bg-paper px-2 py-1">
              {andreBøker.map((bok) => (
                <option key={bok.id} value={encodeUuidToBase32(bok.id)}>{bok.name}</option>
              ))}
            </select>
            <button type="submit" className="rounded-full border border-line px-2 py-1 hover:border-terra hover:text-terra">
              Flytt
            </button>
          </form>
        </LukkbarDetails>
      )}
    </div>
  );
}

interface ChapterComponentProps {
  chapter: Chapter;
  alleKapitler: Chapter[];
  cookbookId: string;
  currentRecipeId?: string;
  erEier: boolean;
  andreBøker: Bok[];
}

// Kapitlene står lukket når boken åpnes — bare kapittelet til oppskriften man leser slår seg
// opp av seg selv. (Åpen/lukket ble før husket i databasen; Maren ville ha en lukket bok.)
function Chapter({ chapter, alleKapitler, cookbookId, currentRecipeId, erEier, andreBøker }: ChapterComponentProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isActiveChapter = chapter.recipes.some(recipe => recipe.id === currentRecipeId);
  if (isActiveChapter && !isOpen) {
    setIsOpen(true);
  }

  return (
    <details
      className="border-b border-line"
      open={isOpen}
      onToggle={(e) => setIsOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer items-baseline justify-between gap-2 py-2.5 font-display text-lg hover:text-terra">
        {chapter.name}
        <span className="text-xs text-ink-soft">{isOpen ? '–' : '+'}</span>
      </summary>

      <div className="pb-3">
        {erEier && <KapittelStell chapter={chapter} andreBøker={andreBøker} />}

        {chapter.recipes.length === 0 ? (
          <p className="px-1 pb-1 text-sm italic text-ink-soft">Ingen oppskrifter ennå</p>
        ) : (
          <ul>
            {chapter.recipes.map((recipe) => (
              <li key={recipe.id} className="flex items-center">
                <Link prefetch={true}
                  href={uuidHref`/kokebok/${cookbookId}/oppskrift/${recipe.id}`}
                  className={`block flex-1 border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors ${
                    currentRecipeId === recipe.id
                      ? 'border-terra font-medium text-terra'
                      : 'border-transparent text-ink hover:border-line hover:text-terra'
                  }`}
                >
                  {recipe.title}
                </Link>

                {erEier && (
                  <span className="flex shrink-0 items-center">
                    <OppskriftPil chapterId={chapter.id} recipe={recipe} retning="opp" />
                    <OppskriftPil chapterId={chapter.id} recipe={recipe} retning="ned" />
                    <FlyttTilKapittel recipe={recipe} gjeldendeKapittelId={chapter.id} kapitler={alleKapitler} andreBøker={andreBøker} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

interface ChapterListProps {
  cookbookId: string;
  chapters: Chapter[];
  ukategorisert: Recipe[];
  // prøvd og lagt bort — bokens arkiv, nederst og sammenleggbart
  arkiverte: Array<{ id: string; title: string }>;
  erEier: boolean;
  andreBøker: Bok[];
}

export function ChapterList({ cookbookId, chapters, ukategorisert, arkiverte, erEier, andreBøker }: ChapterListProps) {
  const currentRecipeId = useRecipeId();

  return (
    <nav aria-label="Innhold" className="border-t border-line">
      {chapters.map((chapter) => (
        <Chapter
          key={chapter.id}
          chapter={chapter}
          alleKapitler={chapters}
          cookbookId={cookbookId}
          currentRecipeId={currentRecipeId}
          erEier={erEier}
          andreBøker={andreBøker}
        />
      ))}

      {ukategorisert.length > 0 && (
        <div className="border-b border-line pt-2.5">
          <h3 className="font-display text-lg italic text-ink-soft">Ukategorisert</h3>

          <ul className="pb-3 pt-1">
            {ukategorisert.map((recipe) => (
              <li key={recipe.id} className="flex items-center">
                <Link prefetch={true}
                  href={uuidHref`/kokebok/${cookbookId}/oppskrift/${recipe.id}`}
                  className={`block flex-1 border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors ${
                    currentRecipeId === recipe.id
                      ? 'border-terra font-medium text-terra'
                      : 'border-transparent text-ink hover:border-line hover:text-terra'
                  }`}
                >
                  {recipe.title}
                </Link>

                {erEier && (chapters.length > 0 || andreBøker.length > 0) && (
                  <FlyttTilKapittel recipe={recipe} gjeldendeKapittelId={null} kapitler={chapters} andreBøker={andreBøker} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {arkiverte.length > 0 && (
        <details className="border-b border-line">
          <summary className="cursor-pointer list-none py-2.5 font-display text-lg italic text-ink-soft hover:text-terra">
            Arkiv ({arkiverte.length})
          </summary>

          <ul className="pb-3">
            {arkiverte.map((recipe) => (
              <li key={recipe.id}>
                <Link prefetch={true}
                  href={uuidHref`/kokebok/${cookbookId}/oppskrift/${recipe.id}`}
                  className={`block border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors ${
                    currentRecipeId === recipe.id
                      ? 'border-terra font-medium text-terra'
                      : 'border-transparent text-ink/60 hover:border-line hover:text-terra'
                  }`}
                >
                  {recipe.title}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </nav>
  );
}
