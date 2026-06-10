'use client';

// Den ene jobben klient-JS faktisk trengs til her: window.print(). Boken skal jo på papir.
export function PrintKnapp() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra"
    >
      Skriv ut siden
    </button>
  );
}
