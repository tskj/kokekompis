// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { oppslag } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb } from "./db";
import "./rtl";
import { cleanup, render, screen } from "./rtl";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect:  vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound:  vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn(), prefetch: vi.fn(), back: vi.fn() })),
}));

import { nyttOppslag, slettOppslag } from "@/app/actions/oppslag";
import OppslagLayout from "@/app/oppslag/layout";
import OppslagOppslag from "@/app/oppslag/[id]/page";

function sideProps(id: string) {
  return { params: Promise.resolve({ id }) };
}

// Oppslagsboka er bygget som en ekte bok: innholdslista i layouten, hvert oppslag på sin egen
// side. De innebygde leses av alle; egne oppslag er dine — bak innlogging, på egen (base32-)id.
describe("oppslagsboka — det man ellers googler", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("de innebygde oppslagene leses av alle — gjester får logge inn for å skrive egne", async () => {
    render(await OppslagLayout({ children: null }));

    expect(screen.getByText("Mål og vekt — omregning")).toBeInTheDocument();
    expect(screen.getByText("Hvor lenge koker et egg?")).toBeInTheDocument();
    expect(screen.getByText("Logg inn for å skrive dine egne oppslag.")).toBeInTheDocument();

    cleanup();
    render(await OppslagOppslag(sideProps("maal-og-vekt")));
    expect(screen.getByText(/1 oz = 28 g/)).toBeInTheDocument();
  });

  it("egne oppslag skrives opp, leses på egen side, og bare dine egne kan slettes", async () => {
    const { user } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    // innskrivingen ender med et hopp rett til det nye oppslaget
    const skjema = new FormData();
    skjema.set("tittel", "Mormors kryddermål");
    skjema.set("tekst", "En «neve» = ca. 2 ss");
    await expect(nyttOppslag(skjema)).rejects.toThrow("NEXT_REDIRECT:/oppslag/");

    const rad = await db.select().from(oppslag).where(eq(oppslag.userId, user.id)).single("test.oppslag");
    expect(rad.tittel).toBe("Mormors kryddermål");

    render(await OppslagLayout({ children: null }));
    expect(screen.getByText("Mormors kryddermål")).toBeInTheDocument();

    cleanup();
    render(await OppslagOppslag(sideProps(encodeUuidToBase32(rad.id))));
    expect(screen.getByText(/En «neve»/)).toBeInTheDocument();

    // en fremmed verken leser eller sletter det
    hoisted.userId = annen.user.id;
    await expect(OppslagOppslag(sideProps(encodeUuidToBase32(rad.id)))).rejects.toThrow("NEXT_NOT_FOUND");
    await slettOppslag(rad.id, new FormData());
    expect(await db.select().from(oppslag).where(eq(oppslag.id, rad.id))).toHaveLength(1);

    // eieren sletter — og sendes hjem til bokens forside
    hoisted.userId = user.id;
    await expect(slettOppslag(rad.id, new FormData())).rejects.toThrow("NEXT_REDIRECT:/oppslag");
    expect(await db.select().from(oppslag).where(eq(oppslag.id, rad.id))).toHaveLength(0);
  });
});
