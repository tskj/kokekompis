import Link from 'next/link';
import type { RecipeContent } from '@/lib/db/schema';
import { GANGER_VALG } from '@/lib/skalering';
import { InfoLinje } from './InfoLinje';
import { IngrediensListe } from './IngrediensListe';
import { StegListe } from './StegListe';
import { Opprinnelse } from './Opprinnelse';
import type { VisEnhet } from './Mengde';

interface OppskriftProps {
  tittel: string;
  beskrivelse?: string | null;
  content: RecipeContent;
  visEnhet: VisEnhet;
  // porsjonsmultiplikator (1 = som skrevet) — allerede validert mot info.kanSkaleres av siden
  ganger?: number;
  // siden som rendrer oppskriften, for toggle-lenkene (URL-state, ikke klient-state)
  stiBase: string;
  // handlingsknapper ("Sett i gang", "Del") — utelates på den offentlige delingssiden
  handlinger?: React.ReactNode;
  // lapper — personlige notater, utelates på delingssiden
  notater?: React.ReactNode;
  // de første lappene, strødd i margen øverst på sida (flyter ved tittelen på brede skjermer)
  notaterStrødd?: React.ReactNode;
  // margskriften (MargSkrift): margstabel + fritt plasserbare skrifter over hele oppskriften
  marg?: React.ReactNode;
  // avkryssbar handleliste for oppskriften — utelates på delingssiden
  handleliste?: React.ReactNode;
  // marg-kommentarene under hvert steg (StegKommentarer) — utelates på delingssiden
  kommentarFelt?: (stegId: string) => React.ReactNode;
  // "Se også"-seksjonen (lenker til andre oppskrifter i boken) — utelates på delingssiden
  relasjoner?: React.ReactNode;
  // bildene av den ferdige retten (RettBilder) — siden veksler nøkler inn i visnings-URL-er
  ferdigBilder?: React.ReactNode;
}

// Flyttet til lib (planene trenger dem på serversiden) — re-eksportert her for visningens skyld.
export { GANGER_VALG, lesGanger } from '@/lib/skalering';

// Det klassiske oppskriftsviewet: tittel, infolinje, ingredienser ved siden av fremgangsmåten,
// og opprinnelsen nederst — som en side i en trykt kokebok.
export function Oppskrift({ tittel, beskrivelse, content, visEnhet, ganger = 1, stiBase, handlinger, notater, notaterStrødd, marg, handleliste, kommentarFelt, relasjoner, ferdigBilder }: OppskriftProps) {
  const kanViseGram = content.ingredienser.some((i) => i.enhet != null && i.enhet !== 'g');

  // toggle-lenkene bevarer hverandres valg — alt er URL-state
  const href = (valg: { enheter?: VisEnhet; ganger?: number }) => {
    const enheter = valg.enheter ?? visEnhet;
    const antallGanger = valg.ganger ?? ganger;

    const query = new URLSearchParams();
    if (enheter === 'gram')  query.set('enheter', 'gram');
    if (antallGanger !== 1)  query.set('ganger', String(antallGanger));

    const qs = query.toString();
    return qs ? `${stiBase}?${qs}` : stiBase;
  };

  return (
    <article className="oppskrift-tekst relative max-w-4xl">
      {/* margskriften: stabelen flyter selv, og de plasserte skriftene ligger fritt over flaten */}
      {marg}

      {/* lapper i margen: flyter ved tittelen, og resten av sida legger seg rundt dem */}
      {notaterStrødd && <div className="float-right ml-8 mb-6 skjul-ved-print">{notaterStrødd}</div>}

      <header className="mb-6">
        <h1 className="font-display text-4xl md:text-5xl leading-tight">{tittel}</h1>
        {beskrivelse && (
          <p className="mt-2 text-lg text-ink-soft max-w-prose">{beskrivelse}</p>
        )}

        {handlinger && <div className="mt-5 flex flex-wrap items-center gap-3 skjul-ved-print">{handlinger}</div>}
      </header>

      <InfoLinje info={content.info} ganger={ganger} />

      <div className="mt-8 grid gap-10 md:grid-cols-[19rem_1fr]">
        <section aria-labelledby="ingredienser">
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <h2 id="ingredienser" className="font-display text-2xl">Ingredienser</h2>

            {kanViseGram && (
              <span className="text-sm skjul-ved-print">
                {visEnhet === 'gram' ? (
                  <Link href={href({ enheter: 'original' })} className="underline underline-offset-2 text-ink-soft hover:text-terra">som skrevet</Link>
                ) : (
                  <Link href={href({ enheter: 'gram' })} className="underline underline-offset-2 text-ink-soft hover:text-terra">vis i gram</Link>
                )}
              </span>
            )}
          </div>

          {content.info.kanSkaleres && (
            <p className="mb-4 flex items-center gap-1 text-sm skjul-ved-print" aria-label="Porsjonsmultiplikator">
              {GANGER_VALG.map((valg) => (
                <Link
                  key={valg}
                  href={href({ ganger: valg })}
                  aria-current={valg === ganger ? 'true' : undefined}
                  className={`rounded-full px-2.5 py-0.5 ${valg === ganger ? 'bg-terra text-paper' : 'text-ink-soft hover:text-terra'}`}
                >
                  {valg === 0.5 ? '½' : valg}×
                </Link>
              ))}
            </p>
          )}

          <IngrediensListe content={content} visEnhet={visEnhet} ganger={ganger} />
        </section>

        <section aria-labelledby="fremgangsmåte">
          <h2 id="fremgangsmåte" className="font-display text-2xl mb-4">Fremgangsmåte</h2>
          <StegListe content={content} kommentarFelt={kommentarFelt} />
        </section>
      </div>

      {handleliste && <div className="mt-8">{handleliste}</div>}

      {relasjoner && <div className="mt-10">{relasjoner}</div>}

      {(content.ferdigprodukt.tekst || ferdigBilder) && (
        <section className="mt-10 border-t border-line pt-5">
          {ferdigBilder}
          {content.ferdigprodukt.tekst && (
            <p className="mt-4 font-display italic text-lg text-ink-soft max-w-prose">{content.ferdigprodukt.tekst}</p>
          )}
        </section>
      )}

      <Opprinnelse opprinnelse={content.opprinnelse} />

      {notater && <div className="mt-10">{notater}</div>}
    </article>
  );
}
