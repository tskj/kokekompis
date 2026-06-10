import Link from 'next/link';
import type { RecipeContent } from '@/lib/db/schema';
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
  // siden som rendrer oppskriften, for enhetstoggle-lenkene (URL-state, ikke klient-state)
  stiBase: string;
  // handlingsknapper ("Sett i gang", "Del") — utelates på den offentlige delingssiden
  handlinger?: React.ReactNode;
  // lapper — personlige notater, utelates på delingssiden
  notater?: React.ReactNode;
  // "Se også"-seksjonen (lenker til andre oppskrifter i boken) — utelates på delingssiden
  relasjoner?: React.ReactNode;
  // bildene av den ferdige retten (RettBilder) — siden veksler nøkler inn i visnings-URL-er
  ferdigBilder?: React.ReactNode;
}

// Det klassiske oppskriftsviewet: tittel, infolinje, ingredienser ved siden av fremgangsmåten,
// og opprinnelsen nederst — som en side i en trykt kokebok.
export function Oppskrift({ tittel, beskrivelse, content, visEnhet, stiBase, handlinger, notater, relasjoner, ferdigBilder }: OppskriftProps) {
  const kanViseGram = content.ingredienser.some((i) => i.enhet != null && i.enhet !== 'g');

  return (
    <article className="max-w-4xl">
      <header className="mb-6">
        <h1 className="font-display text-4xl md:text-5xl leading-tight">{tittel}</h1>
        {beskrivelse && (
          <p className="mt-2 text-lg text-ink-soft max-w-prose">{beskrivelse}</p>
        )}

        {handlinger && <div className="mt-5 flex flex-wrap items-center gap-3 skjul-ved-print">{handlinger}</div>}
      </header>

      <InfoLinje info={content.info} />

      <div className="mt-8 grid gap-10 md:grid-cols-[19rem_1fr]">
        <section aria-labelledby="ingredienser">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <h2 id="ingredienser" className="font-display text-2xl">Ingredienser</h2>

            {kanViseGram && (
              <span className="text-sm skjul-ved-print">
                {visEnhet === 'gram' ? (
                  <Link href={stiBase} className="underline underline-offset-2 text-ink-soft hover:text-terra">som skrevet</Link>
                ) : (
                  <Link href={`${stiBase}?enheter=gram`} className="underline underline-offset-2 text-ink-soft hover:text-terra">vis i gram</Link>
                )}
              </span>
            )}
          </div>

          <IngrediensListe content={content} visEnhet={visEnhet} />
        </section>

        <section aria-labelledby="fremgangsmåte">
          <h2 id="fremgangsmåte" className="font-display text-2xl mb-4">Fremgangsmåte</h2>
          <StegListe content={content} />
        </section>
      </div>

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
