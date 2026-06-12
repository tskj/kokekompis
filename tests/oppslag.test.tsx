// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { oppslag } from "@/lib/db/schema";
import { makeKokebok, resetDb } from "./db";
import "./rtl";
import { render, screen } from "./rtl";

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
import OppslagSide from "@/app/oppslag/page";

describe("oppslagsboka — det man ellers googler", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("de innebygde oppslagene leses av alle — gjester får logge inn for å skrive egne", async () => {
    render(await OppslagSide());

    expect(screen.getByText("Mål og vekt — omregning")).toBeInTheDocument();
    expect(screen.getByText("Hvor lenge koker et egg?")).toBeInTheDocument();
    expect(screen.getByText(/1 oz = 28 g/)).toBeInTheDocument();
    expect(screen.getByText("Logg inn for å skrive dine egne oppslag.")).toBeInTheDocument();
  });

  it("egne oppslag skrives opp, vises, og bare dine egne kan slettes", async () => {
    const { user } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    const skjema = new FormData();
    skjema.set("tittel", "Mormors kryddermål");
    skjema.set("tekst", "En «neve» = ca. 2 ss");
    await nyttOppslag(skjema);

    const rad = await db.select().from(oppslag).where(eq(oppslag.userId, user.id)).single("test.oppslag");
    expect(rad.tittel).toBe("Mormors kryddermål");

    render(await OppslagSide());
    expect(screen.getByText("Mormors kryddermål")).toBeInTheDocument();

    hoisted.userId = annen.user.id;
    await slettOppslag(rad.id, new FormData());
    expect(await db.select().from(oppslag).where(eq(oppslag.id, rad.id))).toHaveLength(1);

    hoisted.userId = user.id;
    await slettOppslag(rad.id, new FormData());
    expect(await db.select().from(oppslag).where(eq(oppslag.id, rad.id))).toHaveLength(0);
  });
});
