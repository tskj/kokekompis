'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { INNEBYGDE_OPPSLAG } from '@/lib/oppslag';

// Innholdslista i Oppslagsboka — samme skikk som i kokebøkene (ChapterList): kapitlene står
// lukket, bare kapittelet til oppslaget man leser slår seg opp av seg selv.

type EgetOppslag = { id: string; tittel: string };

function Oppslagslenke({ id, tittel, aktivId }: { id: string; tittel: string; aktivId: string | null }) {
  return (
    <li>
      <Link prefetch={true}
        href={`/oppslag/${id}`}
        className={`block border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors ${
          aktivId === id
            ? 'border-terra font-medium text-terra'
            : 'border-transparent text-ink hover:border-line hover:text-terra'
        }`}
      >
        {tittel}
      </Link>
    </li>
  );
}

export function OppslagInnhold({ egne }: { egne: EgetOppslag[] }) {
  const params = useParams<{ id?: string }>();
  const aktivId = params.id ?? null;

  const iInnebygde = INNEBYGDE_OPPSLAG.some((innslag) => innslag.id === aktivId);
  const iEgne = egne.some((innslag) => innslag.id === aktivId);

  return (
    <nav aria-label="Innhold" className="border-t border-line">
      <details className="border-b border-line" open={iInnebygde}>
        <summary className="flex cursor-pointer items-baseline justify-between gap-2 py-2.5 font-display text-lg hover:text-terra">
          Alltid i boka
          <span className="text-xs text-ink-soft">{iInnebygde ? '–' : '+'}</span>
        </summary>

        <ul className="pb-3">
          {INNEBYGDE_OPPSLAG.map((innslag) => (
            <Oppslagslenke key={innslag.id} id={innslag.id} tittel={innslag.tittel} aktivId={aktivId} />
          ))}
        </ul>
      </details>

      {egne.length > 0 && (
        <details className="border-b border-line" open={iEgne}>
          <summary className="flex cursor-pointer items-baseline justify-between gap-2 py-2.5 font-display text-lg hover:text-terra">
            Dine egne
            <span className="text-xs text-ink-soft">{iEgne ? '–' : '+'}</span>
          </summary>

          <ul className="pb-3">
            {egne.map((innslag) => (
              <Oppslagslenke key={innslag.id} id={innslag.id} tittel={innslag.tittel} aktivId={aktivId} />
            ))}
          </ul>
        </details>
      )}
    </nav>
  );
}
