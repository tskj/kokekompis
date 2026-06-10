import type { Opprinnelse as OpprinnelseType } from '@/lib/db/schema';

const TYPE_TEKST: Record<OpprinnelseType['type'], string> = {
  person:   'Fra',
  nettside: 'Hentet fra',
  bok:      'Fra boken',
  blad:     'Fra bladet',
  egen:     'Egen oppskrift',
  annet:    'Fra',
};

// Hvor oppskriften kommer fra — mormor, en blogg, en bok. Følger med når oppskriften deles;
// historien er halve verdien av en arvet oppskrift.
export function Opprinnelse({ opprinnelse }: { opprinnelse: OpprinnelseType | null }) {
  if (!opprinnelse) return null;

  const ledetekst = TYPE_TEKST[opprinnelse.type];
  const visning = opprinnelse.type === 'egen' && opprinnelse.navn === '' ? ledetekst : `${ledetekst} ${opprinnelse.navn}`;

  return (
    <footer className="mt-10 border-t border-line pt-5">
      <p className="font-display italic text-lg">
        ❦{' '}
        {opprinnelse.url ? (
          <a href={opprinnelse.url} className="underline decoration-terra/40 underline-offset-4 hover:text-terra" rel="noopener">
            {visning}
          </a>
        ) : (
          visning
        )}
      </p>

      {opprinnelse.historie && (
        <p className="mt-2 max-w-prose text-ink-soft">{opprinnelse.historie}</p>
      )}
    </footer>
  );
}
