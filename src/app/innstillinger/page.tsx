import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { signOut } from '@/auth';
import { getCurrentUserId } from '@/lib/current-user';
import { lesFont, FONT_PRØVER } from '@/lib/fonter';
import { settSkrift } from '@/app/actions/skrift';

// Innstillingene: hvem som er logget inn, veien ut, og skriftvalgene — samlet på ett sted
// (og med plass til mer etter hvert).
export default async function InnstillingerSide() {
  const userId = await getCurrentUserId();

  const bruker = userId
    ? await db
        .select({ name: users.name, email: users.email, tekstFont: users.tekstFont, oppskriftFont: users.oppskriftFont })
        .from(users)
        .where(eq(users.id, userId))
        .maybeSingle('innstillinger.bruker')
    : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-12">
      <header className="mb-10">
        <Link prefetch={true} href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>
        <h1 className="mt-1 font-display text-5xl">Innstillinger</h1>
      </header>

      {!bruker ? (
        <p className="text-ink-soft">Logg inn fra forsiden, så finner du innstillingene her.</p>
      ) : (
        <div className="flex flex-col gap-10">
          <section aria-labelledby="konto">
            <h2 id="konto" className="mb-3 font-display text-2xl">Kontoen</h2>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3">
              <p>
                Logget inn som <span className="font-medium">{bruker.name ?? 'deg'}</span>
                <span className="block text-sm text-ink-soft">{bruker.email}</span>
              </p>

              <form
                action={async () => {
                  'use server';
                  await signOut();
                }}
              >
                <button type="submit" className="rounded-full border border-line px-4 py-2 text-sm hover:border-terra hover:text-terra">
                  Logg ut
                </button>
              </form>
            </div>
          </section>

          <section aria-labelledby="skrift">
            <h2 id="skrift" className="mb-3 font-display text-2xl">Skriften</h2>

            <form action={settSkrift} className="flex flex-col gap-4 rounded-lg border border-line bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Brødtekst på siden">
                <span className="text-ink-soft">Teksten på siden:</span>
                {FONT_PRØVER.map(([verdi, navn, font]) => (
                  <label key={verdi} className="cursor-pointer">
                    <input type="radio" name="tekst" value={verdi} defaultChecked={lesFont(bruker.tekstFont) === verdi} className="peer sr-only" />
                    <span style={{ fontFamily: font }} className="block rounded border border-line bg-paper px-2.5 py-1 peer-checked:ring-2 peer-checked:ring-ink/60">
                      {navn}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Skrift i oppskriftene">
                <span className="text-ink-soft">Selve oppskriftene:</span>
                {FONT_PRØVER.map(([verdi, navn, font]) => (
                  <label key={verdi} className="cursor-pointer">
                    <input type="radio" name="oppskrift" value={verdi} defaultChecked={lesFont(bruker.oppskriftFont) === verdi} className="peer sr-only" />
                    <span style={{ fontFamily: font }} className="block rounded border border-line bg-paper px-2.5 py-1 peer-checked:ring-2 peer-checked:ring-ink/60">
                      {navn}
                    </span>
                  </label>
                ))}
              </div>

              <button type="submit" className="self-start rounded-full bg-terra px-4 py-2 font-medium text-paper hover:bg-terra-deep">
                Bruk skriften
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
