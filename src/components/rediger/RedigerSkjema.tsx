'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { RecipeContent, Enhet, Ingrediens, Steg, Opprinnelse } from '@/lib/db/schema';
import { enheter } from '@/lib/db/schema';
import { oppdaterOppskrift, slettOppskrift } from '@/app/actions/rediger';

// Redigeringsskjemaet — den ene skikkelig interaktive flaten i appen (rader som kommer og går
// trenger klient-state). Tall holdes som strenger i utkastet og tolkes ved lagring, så halvskrevne
// verdier aldri krasjer skjemaet.

interface IngrediensUtkast {
  id: string;
  navn: string;
  mengde: string;
  enhet: Enhet | '';
  kommentar: string;
  gruppe: string;
}

interface StegUtkast {
  id: string;
  tekst: string;
  ingredienser: string[];
  venter: boolean;
  passivHva: string;
  passivMinutter: string;
  imens: boolean;
}

interface RedigerSkjemaProps {
  recipeId: string;
  tittel: string;
  beskrivelse: string | null;
  content: RecipeContent;
  avbrytHref: string;
}

const VARMER = [
  { verdi: '', navn: 'uspesifisert varme' },
  { verdi: 'over_under', navn: 'over- og undervarme' },
  { verdi: 'varmluft', navn: 'varmluft' },
  { verdi: 'grill', navn: 'grill' },
] as const;

const OPPRINNELSE_TYPER = ['person', 'nettside', 'bok', 'blad', 'egen', 'annet'] as const;

function tilTall(s: string): number | null {
  const tall = Number.parseFloat(s.replace(',', '.'));

  return Number.isFinite(tall) ? tall : null;
}

const inputKlasse = 'rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm focus:border-terra focus:outline-none';
const feltTittel  = 'text-[11px] uppercase tracking-[0.14em] text-ink-soft';

export function RedigerSkjema({ recipeId, tittel: startTittel, beskrivelse: startBeskrivelse, content, avbrytHref }: RedigerSkjemaProps) {
  const [tittel, setTittel] = useState(startTittel);
  const [beskrivelse, setBeskrivelse] = useState(startBeskrivelse ?? '');
  const [feil, setFeil] = useState<string | null>(null);
  const [lagrer, startLagring] = useTransition();

  const [antall, setAntall] = useState(String(content.info.porsjoner.antall));
  const [benevnelse, setBenevnelse] = useState(content.info.porsjoner.benevnelse);
  const [kanSkaleres, setKanSkaleres] = useState(content.info.kanSkaleres);
  const [aktivTid, setAktivTid] = useState(content.info.aktivTidMinutter == null ? '' : String(content.info.aktivTidMinutter));
  const [totalTid, setTotalTid] = useState(content.info.totalTidMinutter == null ? '' : String(content.info.totalTidMinutter));

  const [stekes, setStekes] = useState(content.info.stekeinfo != null);
  const [grader, setGrader] = useState(String(content.info.stekeinfo?.graderCelsius ?? 200));
  const [varme, setVarme] = useState<string>(content.info.stekeinfo?.varme ?? '');
  const [stekeMinutter, setStekeMinutter] = useState(String(content.info.stekeinfo?.minutter ?? 20));

  const [oppType, setOppType] = useState<string>(content.opprinnelse?.type ?? 'ingen');
  const [oppNavn, setOppNavn] = useState(content.opprinnelse?.navn ?? '');
  const [oppUrl, setOppUrl] = useState(content.opprinnelse?.url ?? '');
  const [oppHistorie, setOppHistorie] = useState(content.opprinnelse?.historie ?? '');

  const [ferdigTekst, setFerdigTekst] = useState(content.ferdigprodukt.tekst ?? '');

  const [ingredienser, setIngredienser] = useState<IngrediensUtkast[]>(content.ingredienser.map((i) => ({
    id: i.id,
    navn: i.navn,
    mengde: i.mengde == null ? '' : String(i.mengde).replace('.', ','),
    enhet: i.enhet ?? '',
    kommentar: i.kommentar ?? '',
    gruppe: i.gruppe ?? '',
  })));

  const [steg, setSteg] = useState<StegUtkast[]>(content.steg.map((s) => ({
    id: s.id,
    tekst: s.tekst,
    ingredienser: s.ingredienser,
    venter: s.passiv != null,
    passivHva: s.passiv?.hva ?? '',
    passivMinutter: s.passiv?.minutter == null ? '' : String(s.passiv.minutter),
    imens: s.imens,
  })));

  const [nesteId, setNesteId] = useState(1);
  function nyId(prefiks: string): string {
    setNesteId((n) => n + 1);
    return `${prefiks}-${nesteId}`;
  }

  function endreIngrediens(index: number, endring: Partial<IngrediensUtkast>) {
    setIngredienser((alle) => alle.map((rad, i) => (i === index ? { ...rad, ...endring } : rad)));
  }

  function endreSteg(index: number, endring: Partial<StegUtkast>) {
    setSteg((alle) => alle.map((rad, i) => (i === index ? { ...rad, ...endring } : rad)));
  }

  function byggUtkast(): { tittel: string; beskrivelse: string | null; content: RecipeContent } {
    const ingrediensListe: Ingrediens[] = ingredienser
      .filter((rad) => rad.navn.trim() !== '')
      .map((rad) => ({
        id: rad.id,
        navn: rad.navn.trim(),
        mengde: tilTall(rad.mengde),
        enhet: rad.enhet === '' ? null : rad.enhet,
        kommentar: rad.kommentar.trim() || null,
        gruppe: rad.gruppe.trim() || null,
      }));

    const gyldigeIder = new Set(ingrediensListe.map((i) => i.id));
    const stegListe: Steg[] = steg
      .filter((rad) => rad.tekst.trim() !== '')
      .map((rad) => ({
        id: rad.id,
        tekst: rad.tekst.trim(),
        ingredienser: rad.ingredienser.filter((id) => gyldigeIder.has(id)),
        passiv: rad.venter ? { hva: rad.passivHva.trim() || 'venting', minutter: tilTall(rad.passivMinutter) } : null,
        imens: rad.imens,
      }));

    const opprinnelse: Opprinnelse | null = oppType === 'ingen' || oppNavn.trim() === ''
      ? null
      : {
          type: oppType as Opprinnelse['type'],
          navn: oppNavn.trim(),
          url: oppUrl.trim() || null,
          historie: oppHistorie.trim() || null,
        };

    return {
      tittel: tittel.trim(),
      beskrivelse: beskrivelse.trim() || null,
      content: {
        info: {
          porsjoner: { antall: tilTall(antall) ?? 1, benevnelse: benevnelse.trim() || 'porsjoner' },
          kanSkaleres,
          aktivTidMinutter: tilTall(aktivTid),
          totalTidMinutter: tilTall(totalTid),
          stekeinfo: stekes
            ? {
                graderCelsius: tilTall(grader) ?? 200,
                varme: varme === '' ? null : (varme as 'over_under' | 'varmluft' | 'grill'),
                minutter: tilTall(stekeMinutter) ?? 0,
              }
            : null,
        },
        opprinnelse,
        ingredienser: ingrediensListe,
        steg: stegListe,
        ferdigprodukt: { ...content.ferdigprodukt, tekst: ferdigTekst.trim() || null },
      },
    };
  }

  function lagre() {
    setFeil(null);
    startLagring(async () => {
      const resultat = await oppdaterOppskrift(recipeId, byggUtkast());
      if (resultat?.feil) setFeil(resultat.feil);
    });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <p className={feltTittel}>Redigering</p>
        <input
          value={tittel}
          onChange={(e) => setTittel(e.target.value)}
          aria-label="Tittel"
          className="mt-1 w-full bg-transparent font-display text-4xl focus:outline-none border-b border-line focus:border-terra"
        />
        <input
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          aria-label="Beskrivelse"
          placeholder="En linje om retten …"
          className="mt-3 w-full bg-transparent text-lg text-ink-soft focus:outline-none border-b border-line focus:border-terra"
        />
      </header>

      <section className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className={feltTittel}>Gir</span>
          <span className="mt-1 flex gap-2">
            <input value={antall} onChange={(e) => setAntall(e.target.value)} aria-label="Antall porsjoner" className={`${inputKlasse} w-16`} />
            <input value={benevnelse} onChange={(e) => setBenevnelse(e.target.value)} aria-label="Benevnelse" className={`${inputKlasse} w-28`} />
          </span>
          <label className="mt-1.5 flex items-center gap-2 text-sm" title="Skru av for retter som ikke kan ganges opp — f.eks. bundet til én langpanne">
            <input type="checkbox" checked={kanSkaleres} onChange={(e) => setKanSkaleres(e.target.checked)} />
            kan skaleres (½×/2×/4×)
          </label>
        </label>

        <label className="block">
          <span className={feltTittel}>Aktiv tid (min)</span>
          <input value={aktivTid} onChange={(e) => setAktivTid(e.target.value)} aria-label="Aktiv tid i minutter" className={`${inputKlasse} mt-1 block w-24`} />
        </label>

        <label className="block">
          <span className={feltTittel}>Totalt (min)</span>
          <input value={totalTid} onChange={(e) => setTotalTid(e.target.value)} aria-label="Total tid i minutter" className={`${inputKlasse} mt-1 block w-24`} />
        </label>

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={stekes} onChange={(e) => setStekes(e.target.checked)} />
            stekes i ovn
          </label>

          {stekes && (
            <span className="mt-1 flex items-center gap-2 text-sm">
              <input value={grader} onChange={(e) => setGrader(e.target.value)} aria-label="Grader celsius" className={`${inputKlasse} w-16`} />°C
              <select value={varme} onChange={(e) => setVarme(e.target.value)} aria-label="Varme" className={inputKlasse}>
                {VARMER.map((v) => <option key={v.verdi} value={v.verdi}>{v.navn}</option>)}
              </select>
              <input value={stekeMinutter} onChange={(e) => setStekeMinutter(e.target.value)} aria-label="Steketid i minutter" className={`${inputKlasse} w-16`} /> min
            </span>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl mb-3">Ingredienser</h2>

        <div className="space-y-2">
          {ingredienser.map((rad, index) => (
            <div key={rad.id} className="flex flex-wrap items-center gap-2">
              <input value={rad.mengde} onChange={(e) => endreIngrediens(index, { mengde: e.target.value })} aria-label={`Mengde ${index + 1}`} placeholder="mengde" className={`${inputKlasse} w-20`} />
              <select value={rad.enhet} onChange={(e) => endreIngrediens(index, { enhet: e.target.value as Enhet | '' })} aria-label={`Enhet ${index + 1}`} className={inputKlasse}>
                <option value="">(enhet)</option>
                {enheter.map((enhet) => <option key={enhet} value={enhet}>{enhet}</option>)}
              </select>
              <input value={rad.navn} onChange={(e) => endreIngrediens(index, { navn: e.target.value })} aria-label={`Ingrediens ${index + 1}`} placeholder="ingrediens" className={`${inputKlasse} w-44 flex-1`} />
              <input value={rad.kommentar} onChange={(e) => endreIngrediens(index, { kommentar: e.target.value })} aria-label={`Kommentar ${index + 1}`} placeholder="kommentar" className={`${inputKlasse} w-36`} />
              <input value={rad.gruppe} onChange={(e) => endreIngrediens(index, { gruppe: e.target.value })} aria-label={`Gruppe ${index + 1}`} placeholder="gruppe" className={`${inputKlasse} w-24`} />
              <button
                type="button"
                onClick={() => setIngredienser((alle) => alle.filter((_, i) => i !== index))}
                aria-label={`Fjern ingrediens ${index + 1}`}
                className="size-7 rounded-full text-ink/40 hover:bg-ink/10 hover:text-ink"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIngredienser((alle) => [...alle, { id: nyId('ny'), navn: '', mengde: '', enhet: '', kommentar: '', gruppe: alle.at(-1)?.gruppe ?? '' }])}
          className="mt-3 rounded-full border-2 border-dashed border-line px-4 py-1.5 text-sm text-ink-soft hover:border-terra hover:text-terra"
        >
          + ingrediens
        </button>
      </section>

      <section>
        <h2 className="font-display text-2xl mb-3">Fremgangsmåte</h2>

        <div className="space-y-4">
          {steg.map((rad, index) => (
            <div key={rad.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="font-display text-xl italic text-terra pt-1.5">{index + 1}</span>
                <textarea
                  value={rad.tekst}
                  onChange={(e) => endreSteg(index, { tekst: e.target.value })}
                  aria-label={`Steg ${index + 1}`}
                  rows={2}
                  className={`${inputKlasse} w-full resize-y`}
                />
                <button
                  type="button"
                  onClick={() => setSteg((alle) => alle.filter((_, i) => i !== index))}
                  aria-label={`Fjern steg ${index + 1}`}
                  className="size-7 shrink-0 rounded-full text-ink/40 hover:bg-ink/10 hover:text-ink"
                >
                  ×
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-8 text-sm">
                {ingredienser.filter((i) => i.navn.trim() !== '').map((ingrediens) => (
                  <label key={ingrediens.id} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={rad.ingredienser.includes(ingrediens.id)}
                      onChange={(e) => endreSteg(index, {
                        ingredienser: e.target.checked
                          ? [...rad.ingredienser, ingrediens.id]
                          : rad.ingredienser.filter((id) => id !== ingrediens.id),
                      })}
                    />
                    {ingrediens.navn}
                  </label>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 pl-8 text-sm text-ink-soft">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={rad.venter} onChange={(e) => endreSteg(index, { venter: e.target.checked })} />
                  venting
                </label>
                {rad.venter && (
                  <>
                    <input value={rad.passivHva} onChange={(e) => endreSteg(index, { passivHva: e.target.value })} aria-label={`Hva ventes det på i steg ${index + 1}`} placeholder="heving, steking …" className={`${inputKlasse} w-36`} />
                    <span className="flex items-center gap-1">
                      <input value={rad.passivMinutter} onChange={(e) => endreSteg(index, { passivMinutter: e.target.value })} aria-label={`Ventetid i minutter for steg ${index + 1}`} placeholder="min" className={`${inputKlasse} w-16`} /> min
                    </span>
                  </>
                )}
                <label className="flex items-center gap-1.5" title="Kan gjøres mens forrige venting pågår">
                  <input type="checkbox" checked={rad.imens} onChange={(e) => endreSteg(index, { imens: e.target.checked })} />
                  kan gjøres imens
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setSteg((alle) => [...alle, { id: nyId('steg'), tekst: '', ingredienser: [], venter: false, passivHva: '', passivMinutter: '', imens: false }])}
          className="mt-3 rounded-full border-2 border-dashed border-line px-4 py-1.5 text-sm text-ink-soft hover:border-terra hover:text-terra"
        >
          + steg
        </button>
      </section>

      <section className="flex flex-wrap gap-6">
        <label className="block">
          <span className={feltTittel}>Opprinnelse</span>
          <span className="mt-1 flex flex-wrap gap-2">
            <select value={oppType} onChange={(e) => setOppType(e.target.value)} aria-label="Opprinnelsestype" className={inputKlasse}>
              <option value="ingen">ingen</option>
              {OPPRINNELSE_TYPER.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            {oppType !== 'ingen' && (
              <>
                <input value={oppNavn} onChange={(e) => setOppNavn(e.target.value)} aria-label="Opprinnelsens navn" placeholder="Mormor Åse / bloggens navn" className={`${inputKlasse} w-52`} />
                <input value={oppUrl} onChange={(e) => setOppUrl(e.target.value)} aria-label="Opprinnelsens URL" placeholder="https:// (valgfri)" className={`${inputKlasse} w-52`} />
              </>
            )}
          </span>
          {oppType !== 'ingen' && (
            <textarea
              value={oppHistorie}
              onChange={(e) => setOppHistorie(e.target.value)}
              aria-label="Opprinnelsens historie"
              placeholder="Historien bak oppskriften …"
              rows={2}
              className={`${inputKlasse} mt-2 block w-full max-w-xl resize-y`}
            />
          )}
        </label>
      </section>

      <section>
        <label className="block max-w-xl">
          <span className={feltTittel}>Om det ferdige produktet</span>
          <textarea
            value={ferdigTekst}
            onChange={(e) => setFerdigTekst(e.target.value)}
            aria-label="Om det ferdige produktet"
            rows={2}
            className={`${inputKlasse} mt-1 block w-full resize-y`}
          />
        </label>
      </section>

      {feil && (
        <p role="alert" className="rounded-lg border-2 border-terra/50 bg-terra/10 px-4 py-3">{feil}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={lagre}
          disabled={lagrer}
          className="rounded-full bg-terra px-6 py-2.5 font-medium text-paper hover:bg-terra-deep disabled:opacity-60"
        >
          {lagrer ? 'Lagrer …' : 'Lagre oppskriften'}
        </button>

        <Link href={avbrytHref} className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-terra hover:text-terra">
          Avbryt
        </Link>

        <details className="ml-auto">
          <summary className="cursor-pointer list-none text-sm text-ink-soft underline underline-offset-2 hover:text-terra">
            Slett oppskriften …
          </summary>
          <button
            type="button"
            onClick={() => startLagring(async () => { await slettOppskrift(recipeId); })}
            className="mt-2 rounded-full border-2 border-terra px-4 py-1.5 text-sm font-medium text-terra hover:bg-terra hover:text-paper"
          >
            Ja, riv den ut av boken
          </button>
        </details>
      </div>
    </div>
  );
}
