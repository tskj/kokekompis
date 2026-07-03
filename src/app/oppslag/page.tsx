import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { oppslag } from '@/lib/db/schema';
import { getCurrentUserId } from '@/lib/current-user';
import { INNEBYGDE_OPPSLAG } from '@/lib/oppslag';
import { Kaffeflekk } from '@/components/Kaffeflekk';
import { Kompis } from '@/components/Kompis';
import { OppslagTegning } from '@/components/oppslag-tegninger';
import { LukkbarDetails } from '@/components/LukkbarDetails';
import { nyttOppslag, slettOppslag } from '@/app/actions/oppslag';

// Oppslagsboka: ikke en kokebok, men oppslagsverket ved siden av — alt man ellers googler.
// Noen oppslag ligger inne fra før; resten skriver man opp selv, én gang for alle.
export default async function OppslagSide() {
  const userId = await getCurrentUserId();

  const egne = userId
    ? await db
        .select({ id: oppslag.id, tittel: oppslag.tittel, tekst: oppslag.tekst })
        .from(oppslag)
        .where(eq(oppslag.userId, userId))
        .orderBy(asc(oppslag.tittel))
    : [];

  return (
    <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-12">
      <Kaffeflekk className="absolute -top-16 -right-24 w-56 rotate-[140deg]" />

      <header className="relative mb-10">
        <Link prefetch={true} href="/" className="text-sm text-ink-soft hover:text-terra">← Bokhylla</Link>
        <h1 className="mt-1 font-display text-5xl">Oppslagsboka</h1>
        <p className="mt-2 max-w-md font-display italic text-lg text-ink-soft md:max-w-lg">
          Alt man ellers googler — omregning, eggetider, borddekking. Og plass til ditt eget.
        </p>

        {/* Kompisen — husnissen som passer på oppslagene fra toppen av siden */}
        <Kompis className="absolute -top-2 right-0 w-20 md:w-24" />

        <div aria-hidden className="mt-4 border-b-4 border-double border-ink/25" />
      </header>

      <section aria-label="Innebygde oppslag" className="flex flex-col">
        {INNEBYGDE_OPPSLAG.map((innslag) => (
          <details key={innslag.id} className="border-b border-line">
            <summary className="flex cursor-pointer items-center justify-between gap-3 py-2.5 font-display text-xl hover:text-terra">
              <span className="flex items-center gap-3">
                <OppslagTegning id={innslag.id} className="w-14 shrink-0" />
                {innslag.tittel}
              </span>
              <span aria-hidden className="text-xs text-ink-soft">+</span>
            </summary>
            <p className="whitespace-pre-line pb-4 leading-relaxed md:pl-[4.25rem]">{innslag.tekst}</p>
          </details>
        ))}
      </section>

      <section aria-labelledby="egne" className="mt-12">
        <h2 id="egne" className="mb-1.5 font-display text-3xl">Dine egne oppslag</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Det du alltid må slå opp — skriv det her, så slipper du å google det neste gang.
        </p>

        {!userId ? (
          <p className="text-ink-soft">Logg inn for å skrive dine egne oppslag.</p>
        ) : (
          <>
            {egne.length > 0 && (
              <div className="mb-6 flex flex-col">
                {egne.map((innslag) => (
                  <details key={innslag.id} className="group relative border-b border-line">
                    <summary className="flex cursor-pointer items-baseline justify-between gap-2 py-3 pr-8 font-display text-xl hover:text-terra">
                      {innslag.tittel}
                      <span aria-hidden className="text-xs text-ink-soft">+</span>
                    </summary>
                    <p className="whitespace-pre-line pb-4 leading-relaxed">{innslag.tekst}</p>

                    <form action={slettOppslag.bind(null, innslag.id)} className="absolute right-0 top-3">
                      <button
                        type="submit"
                        aria-label={`Slett oppslaget ${innslag.tittel}`}
                        title="Slett oppslaget"
                        className="size-6 rounded-full text-ink/30 hover:bg-ink/10 hover:text-ink"
                      >
                        ×
                      </button>
                    </form>
                  </details>
                ))}
              </div>
            )}

            <LukkbarDetails className="max-w-md">
              <summary className="cursor-pointer list-none border-2 border-dashed border-line px-4 py-3 text-center text-sm text-ink-soft hover:border-terra hover:text-terra">
                + Nytt oppslag — «hvor mange gram er en oz?»
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
          </>
        )}
      </section>
    </main>
  );
}
