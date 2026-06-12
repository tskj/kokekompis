'use client';

// Den ene jobben klient-JS faktisk trengs til her: window.print(). Boken skal jo på papir.
// Bare et ikon — handlingsraden skal være rolig.
export function PrintKnapp() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label="Skriv ut siden"
      title="Skriv ut siden"
      className="flex size-9 items-center justify-center rounded-full border border-line text-ink-soft hover:border-terra hover:text-terra"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 8 V4 h10 v4" />
        <rect x="4" y="8" width="16" height="8" rx="1.5" />
        <path d="M7 13 h10 v7 h-10 z" fill="var(--color-paper)" />
      </svg>
    </button>
  );
}
