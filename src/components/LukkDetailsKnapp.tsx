'use client';

// Et synlig kryss som lukker nærmeste <details> — å vite at man kan trykke på summary-knappen
// igjen er ikke åpenbart, et × er det.
export function LukkDetailsKnapp({ className, merkelapp }: { className?: string; merkelapp: string }) {
  return (
    <button
      type="button"
      aria-label={merkelapp}
      title={merkelapp}
      className={className}
      onClick={(e) => {
        const details = e.currentTarget.closest('details');
        if (details) details.open = false;
      }}
    >
      ×
    </button>
  );
}
