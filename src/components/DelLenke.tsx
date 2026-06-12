'use client';

import { useEffect, useState } from 'react';

// Eierens deleverktøy på delingssiden: kopier lenken, eller send den rett på e-post.
// Lenken er sidens egen URL — den bygges i nettleseren, så den alltid peker dit man står.
export function DelLenke({ emne, hilsen }: { emne: string; hilsen: string }) {
  const [url, setUrl] = useState('');
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(window.location.href);
          setKopiert(true);
          setTimeout(() => setKopiert(false), 2000);
        }}
        className="rounded-full bg-terra px-4 py-1.5 text-sm font-medium text-paper hover:bg-terra-deep"
      >
        {kopiert ? '✓ Kopiert!' : 'Kopier lenken'}
      </button>

      {url && (
        <a
          href={`mailto:?subject=${encodeURIComponent(emne)}&body=${encodeURIComponent(`${hilsen}\n\n${url}`)}`}
          className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-terra hover:text-terra"
        >
          Send på e-post
        </a>
      )}
    </span>
  );
}
