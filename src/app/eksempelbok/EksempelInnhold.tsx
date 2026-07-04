'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EKSEMPEL_KAPITLER, EKSEMPEL_OPPSKRIFTER } from '@/lib/eksempelbok';

// Innholdslista i eksempelboka — samme skikk som i en ekte bok (ChapterList): kapitlene står
// lukket, bare kapittelet til oppskriften man leser slår seg opp av seg selv. Ingen
// eier-verktøy her — gjesten leser.
export function EksempelInnhold() {
  const { slug } = useParams<{ slug?: string }>();

  return (
    <nav aria-label="Innhold" className="border-t border-line">
      {EKSEMPEL_KAPITLER.map((kapittel) => {
        const aktiv = kapittel.oppskrifter.includes(slug ?? '');

        return (
          <details key={kapittel.navn} className="border-b border-line" open={aktiv}>
            <summary className="flex cursor-pointer items-baseline justify-between gap-2 py-2.5 font-display text-lg hover:text-terra">
              {kapittel.navn}
              <span className="text-xs text-ink-soft">{aktiv ? '–' : '+'}</span>
            </summary>

            <ul className="pb-3">
              {kapittel.oppskrifter.map((oppskriftSlug) => {
                const oppskrift = EKSEMPEL_OPPSKRIFTER.find((kandidat) => kandidat.slug === oppskriftSlug);
                if (!oppskrift) return null;

                return (
                  <li key={oppskrift.slug}>
                    <Link prefetch={true}
                      href={`/eksempelbok/${oppskrift.slug}`}
                      className={`block flex-1 border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors ${
                        slug === oppskrift.slug
                          ? 'border-terra font-medium text-terra'
                          : 'border-transparent text-ink hover:border-line hover:text-terra'
                      }`}
                    >
                      {oppskrift.tittel}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </nav>
  );
}
