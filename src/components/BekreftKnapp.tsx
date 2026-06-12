'use client';

// En submit-knapp med er-du-sikker foran — for det som ikke kan angres (sletting for godt).
// Avbryt stopper innsendingen; uten klient-JS faller den tilbake til vanlig submit.
export function BekreftKnapp({ spørsmål, className, children }: { spørsmål: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(spørsmål)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
