import { leggTilNotat } from '@/app/actions/notater';
import { TEIP_KLASSE, type Notat } from '@/components/oppskrift/NotatTavle';

// Lappene i bakeviewet: kompakte, lesbare, og med et raskt "skriv og teip"-felt — midt i
// stekingen husker man at jordbærene mangler. Redigering og riving hører hjemme i det vanlige
// viewet; her skal ingenting kunne skje ved et uhell.
export function BakNotater({ recipeId, notater }: { recipeId: string; notater: Notat[] }) {
  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pt-3">
      {notater.map((notat) => (
        <p
          key={notat.id}
          className="notatlapp relative max-w-56 shrink-0 py-1.5 pl-4 pr-3 font-skrift text-lg leading-6 drop-shadow-sm"
        >
          <span aria-hidden className={`${TEIP_KLASSE[notat.farge]} teipbit absolute inset-y-0 left-0 w-2 opacity-85`} />
          {notat.tekst}
        </p>
      ))}

      <form action={leggTilNotat.bind(null, recipeId)} className="flex shrink-0 items-center gap-2">
        <input type="hidden" name="farge" value="terrakotta" />
        <input
          type="text"
          name="tekst"
          required
          maxLength={500}
          placeholder="Ny lapp — «husk jordbær til pynt»"
          aria-label="Ny lapp"
          className="w-64 rounded-lg border border-line bg-card px-3 py-1.5 font-skrift text-lg placeholder:text-ink/35 focus:border-terra focus:outline-none"
        />
        <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-terra hover:text-terra">
          Teip på
        </button>
      </form>
    </div>
  );
}
