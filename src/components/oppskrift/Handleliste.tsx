import type { Ingrediens } from '@/lib/db/schema';
import { Mengde } from './Mengde';

// Avkryssbar handleliste — papir, ikke app: hakene lever i nettleseren til siden forlates,
// ingenting lagres. Ren CSS (peer-checked) stryker over linjen; fungerer uten klient-JS.
export function Handleliste({ linjer, ganger = 1 }: { linjer: Ingrediens[]; ganger?: number }) {
  if (linjer.length === 0) return null;

  return (
    <ul className="columns-1 gap-10 sm:columns-2">
      {linjer.map((linje) => (
        <li key={linje.id} className="break-inside-avoid py-0.5">
          <label className="flex cursor-pointer items-baseline gap-2.5">
            <input type="checkbox" className="peer size-4 shrink-0 translate-y-0.5 accent-terra" />
            <span className="peer-checked:text-ink-soft peer-checked:line-through">
              <Mengde ingrediens={linje} visEnhet="original" ganger={ganger} /> {linje.navn}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
