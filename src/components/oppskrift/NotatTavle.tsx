import type { NotatFarge } from '@/lib/db/schema';
import { leggTilNotat, slettNotat } from '@/app/actions/notater';

export type Notat = { id: string; tekst: string; farge: NotatFarge };

// Teipfargen er det som lagres som "farge" — lappen selv er alltid en avrevet bit linjert
// notatbokpapir (.notatlapp i globals.css), holdt fast av en bit dekorteip (.teipbit).
export const TEIP_KLASSE: Record<NotatFarge, string> = {
  terrakotta: 'bg-teip-terrakotta',
  rav:        'bg-teip-rav',
  salvie:     'bg-teip-salvie',
  sand:       'bg-teip-sand',
};

const ROTASJONER = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];
const TEIP_ROTASJONER = ['-rotate-3', 'rotate-2', 'rotate-6', '-rotate-2'];

function Teip({ farge, index }: { farge: NotatFarge; index: number }) {
  return (
    <span
      aria-hidden
      className={`${TEIP_KLASSE[farge]} ${TEIP_ROTASJONER[index % TEIP_ROTASJONER.length]} teipbit absolute -top-2.5 left-1/2 h-6 w-20 -translate-x-1/2 opacity-85`}
    />
  );
}

function NotatKort({ notat, index }: { notat: Notat; index: number }) {
  return (
    <div className={`${ROTASJONER[index % ROTASJONER.length]} relative w-44 drop-shadow-md`}>
      <div className="notatlapp min-h-36 px-4 pb-6 pt-[22px]">
        <p className="font-skrift text-xl leading-6 break-words">{notat.tekst}</p>
      </div>
      <Teip farge={notat.farge} index={index} />

      <form action={slettNotat.bind(null, notat.id)} className="absolute top-0.5 right-0.5">
        <button
          type="submit"
          aria-label="Riv av lappen"
          title="Riv av lappen"
          className="size-6 rounded-full text-ink/40 hover:text-ink hover:bg-ink/10 leading-none"
        >
          ×
        </button>
      </form>
    </div>
  );
}

// Lapper "teipet på" oppskriften — "husk jordbær til pynt", "denne var ikke god!".
// Rene <form action>-er hele veien: lappene fungerer uten klient-JS, også i bakeviewet.
export function NotatTavle({ recipeId, notater }: { recipeId: string; notater: Notat[] }) {
  return (
    <section aria-label="Notater" className="skjul-ved-print">
      <div className="flex flex-wrap items-start gap-5 pt-3">
        {notater.map((notat, index) => (
          <NotatKort key={notat.id} notat={notat} index={index} />
        ))}

        <details className="group w-44">
          <summary className="flex min-h-36 cursor-pointer list-none flex-col items-center justify-center gap-1 border-2 border-dashed border-line text-ink-soft hover:border-terra hover:text-terra group-open:hidden">
            <span className="text-3xl leading-none">+</span>
            <span className="font-skrift text-xl">ny lapp</span>
          </summary>

          <form action={leggTilNotat.bind(null, recipeId)} className="relative w-44 drop-shadow-md">
            <span aria-hidden className="bg-teip-sand teipbit absolute -top-2.5 left-1/2 z-10 h-6 w-20 -translate-x-1/2 -rotate-2 opacity-85" />
            <div className="notatlapp space-y-2 px-3 pb-5 pt-[22px]">
              <textarea
                name="tekst"
                required
                maxLength={500}
                rows={3}
                placeholder="Skriv på lappen …"
                aria-label="Notat"
                className="w-full resize-none bg-transparent font-skrift text-xl leading-6 placeholder:text-ink/40 focus:outline-none"
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5" role="radiogroup" aria-label="Teipfarge">
                  {(Object.keys(TEIP_KLASSE) as NotatFarge[]).map((farge, i) => (
                    <label key={farge} className="cursor-pointer">
                      <input type="radio" name="farge" value={farge} defaultChecked={i === 0} className="peer sr-only" />
                      <span
                        title={farge}
                        className={`${TEIP_KLASSE[farge]} block size-5 rounded-full border border-ink/20 peer-checked:ring-2 peer-checked:ring-ink/60`}
                      />
                    </label>
                  ))}
                </div>

                <button type="submit" className="text-sm font-medium underline underline-offset-2 hover:text-terra">
                  Teip på
                </button>
              </div>
            </div>
          </form>
        </details>
      </div>
    </section>
  );
}
