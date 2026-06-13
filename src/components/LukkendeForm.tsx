'use client';

// Et skjema som lukker nærmeste <details> idet det sendes — for lagre-knapper inne i paneler
// som ellers lar lukkingen være opp til brukeren (utseende-panelet). Lagringen kjører videre;
// et lukket details skjuler bare innholdet.
export function LukkendeForm({ action, className, children }: { action: (formData: FormData) => void | Promise<void>; className?: string; children: React.ReactNode }) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        const details = (e.currentTarget as HTMLElement).closest('details');
        if (details) details.open = false;
      }}
    >
      {children}
    </form>
  );
}
