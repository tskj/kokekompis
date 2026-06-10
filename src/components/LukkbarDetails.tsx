'use client';

import { useEffect, useRef } from 'react';

// <details> som lukker seg på klikk utenfor — native details henger ellers åpen til man treffer
// summary igjen, som føles galt for popovere (flytt-menyen). Selve innholdet er fortsatt
// server-rendret; dette skallet er bare lukkeoppførselen.
export function LukkbarDetails({ className, children }: { className?: string; children: React.ReactNode }) {
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
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}
