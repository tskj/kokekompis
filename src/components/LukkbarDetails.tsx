'use client';

import { useEffect, useRef } from 'react';

// <details> med popover-manerer: lukker seg på klikk utenfor, og når et skjema inni sendes
// (lagringen kjører videre — et lukket <details> skjuler bare innholdet, det avbryter
// ingenting). Native details henger ellers åpen til man treffer summary igjen, som føles galt
// for popovere. Selve innholdet er fortsatt server-rendret; dette skallet er lukkeoppførselen.
export function LukkbarDetails({ className, children, startÅpen = false, lukkVedInnsending = true }: { className?: string; children: React.ReactNode; startÅpen?: boolean; lukkVedInnsending?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function påPekerNed(e: PointerEvent) {
      const el = ref.current;
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) el.open = false;
    }

    document.addEventListener('pointerdown', påPekerNed);
    return () => document.removeEventListener('pointerdown', påPekerNed);
  }, []);

  return (
    <details
      ref={ref}
      className={className}
      open={startÅpen || undefined}
      onSubmit={() => {
        if (lukkVedInnsending && ref.current) ref.current.open = false;
      }}
    >
      {children}
    </details>
  );
}
