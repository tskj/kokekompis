import type { RecipeContent } from '@/lib/db/schema';
import { formaterMinutter, formaterVarme } from '@/lib/enheter';

// Den klassiske "banneren": porsjoner, tider og ovnsinfo på én linje, som kolofonen i en trykt
// kokebok. Totaltiden (fra start til spiseklart) er den viktigste — den står først og fetest.
export function InfoLinje({ info }: { info: RecipeContent['info'] }) {
  const felter: Array<{ navn: string; verdi: string }> = [];

  if (info.totalTidMinutter != null) felter.push({ navn: 'Fra start til spiseklart', verdi: formaterMinutter(info.totalTidMinutter) });
  if (info.aktivTidMinutter != null) felter.push({ navn: 'Aktiv tid', verdi: formaterMinutter(info.aktivTidMinutter) });

  felter.push({ navn: 'Gir', verdi: `${info.porsjoner.antall} ${info.porsjoner.benevnelse}` });

  if (info.stekeinfo) {
    const varme = info.stekeinfo.varme ? `, ${formaterVarme(info.stekeinfo.varme)}` : '';
    felter.push({ navn: 'Ovn', verdi: `${info.stekeinfo.graderCelsius}°C${varme} · ${info.stekeinfo.minutter} min` });
  }

  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-3 border-y-2 border-double border-line py-4">
      {felter.map((felt) => (
        <div key={felt.navn}>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">{felt.navn}</dt>
          <dd className="font-display text-lg">{felt.verdi}</dd>
        </div>
      ))}
    </dl>
  );
}
