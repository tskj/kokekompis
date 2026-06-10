'use client';

import { useFormStatus } from 'react-dom';

// Send-knapp med ventetilstand: AI-importen tar gjerne et halvt minutt, og uten tilbakemelding
// trykker man igjen og igjen. Deaktivert + snurrer mens skjemaets action kjører.
export function SendeKnapp({ barn, venteTekst }: { barn: React.ReactNode; venteTekst: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-terra px-5 py-2 text-sm font-medium text-paper hover:bg-terra-deep disabled:cursor-wait disabled:opacity-70"
    >
      {pending && (
        <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
      )}
      {pending ? venteTekst : barn}
    </button>
  );
}
