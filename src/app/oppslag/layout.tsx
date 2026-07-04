import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { oppslag } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';
import { encodeUuidToBase32 } from '@/lib/uuid/uuid-base32';
import { BÅND_KLASSER, BOK_FARGE_VAR } from '@/lib/bok-utseende';
import { Kaffeflekk } from '@/components/Kaffeflekk';
import { Kompis } from '@/components/Kompis';
import { BlaOm } from '@/components/BlaOm';
import { LukkbarDetails } from '@/components/LukkbarDetails';
import { nyttOppslag } from '@/app/actions/oppslag';
import { OppslagInnhold } from './OppslagInnhold';

// Oppslagsboka innvendig — samme oppsett som kokebøkene (kokebok/[id]/layout.tsx): bokheader
// med dobbelstrek og bånd, innholdslista til venstre, oppslaget til høyre med
// bla-om-animasjonen. Ikke en kokebok, men den skal KJENNES som en bok fra samme hylle.
export default async function OppslagLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();

  const egne = userId
    ? await db
        .select({ id: oppslag.id, tittel: oppslag.tittel })
        .from(oppslag)
        .where(eq(oppslag.userId, userId))
        .orderBy(asc(oppslag.tittel))
    : [];

  return (
    <div className="relative mx-auto max-w-7xl p-4 sm:p-6 md:p-10">
      <Kaffeflekk className="absolute -top-16 -right-24 w-56 rotate-[140deg] skjul-ved-print" />

      <header className="relative mb-8 skjul-ved-print">
        <Link prefetch={true} href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>

        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="font-display text-4xl">Oppslagsboka</h1>
        </div>

        <p className="mt-1.5 text-xs text-ink-soft">
          Alt man ellers googler — omregning, eggetider, borddekking. Og plass til ditt eget.
        </p>

        {/* Kompisen — husnissen som passer på oppslagene fra toppen av siden */}
        <Kompis className="absolute -top-2 right-0 w-20 md:w-24" />

        {/* dobbeltstrek under tittelfeltet — den gamle kokebokens linjespill */}
        <div aria-hidden className="mt-4 border-b-4 border-double border-ink/25" />

        <div aria-hidden className="mt-4 h-24 overflow-hidden rounded-sm border border-line shadow-sm md:h-32">
          <div
            className={`h-full w-full ${BÅND_KLASSER.prikker}`}
            style={{ '--baand-farge': BOK_FARGE_VAR.natt } as React.CSSProperties}
          />
        </div>
      </header>

      {/* som i en ekte bok: på mobil kommer oppslaget FØR innholdslista */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
        <div className="order-2 lg:order-1 lg:col-span-1 skjul-ved-print">
          <div className="sticky top-6">
            <h2 className="mb-3 text-[11px] uppercase tracking-[0.2em] text-ink-soft">Innhold</h2>

            <OppslagInnhold egne={egne.map((innslag) => ({ id: encodeUuidToBase32(innslag.id), tittel: innslag.tittel }))} />

            {userId ? (
              <LukkbarDetails className="mt-4">
                <summary className="cursor-pointer list-none py-1 text-sm text-ink-soft hover:text-terra">
                  + nytt oppslag — «hvor mange gram er en oz?»
                </summary>

                <form action={nyttOppslag} className="mt-2 flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
                  <label className="block text-sm">
                    <span className="text-ink-soft">Hva gjelder det?</span>
                    <input
                      name="tittel"
                      required
                      maxLength={100}
                      placeholder="Mormors kryddermål"
                      className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 font-display focus:border-terra focus:outline-none"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="text-ink-soft">Det som skal huskes</span>
                    <textarea
                      name="tekst"
                      required
                      maxLength={2000}
                      rows={4}
                      placeholder={'En «neve» = ca. 2 ss\nEn «skvett» = til det ser riktig ut'}
                      className="mt-1 block w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 focus:border-terra focus:outline-none"
                    />
                  </label>

                  <button type="submit" className="self-start rounded-full bg-terra px-4 py-2 text-sm font-medium text-paper hover:bg-terra-deep">
                    Skriv det opp
                  </button>
                </form>
              </LukkbarDetails>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">Logg inn for å skrive dine egne oppslag.</p>
            )}
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-3">
          <BlaOm>{children}</BlaOm>
        </div>
      </div>
    </div>
  );
}
