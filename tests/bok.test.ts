import { beforeEach, describe, expect, it, vi } from "vitest";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, cookbook } from "@/lib/db/schema";
import { makeKokebok, resetDb } from "./db";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

import { opprettBok, endreBokNavn, nyttKapittel } from "@/app/actions/bok";

function skjema(navn: string): FormData {
  const formData = new FormData();
  formData.set("navn", navn);

  return formData;
}

describe("bok-stell (ekte actions, ekte database)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("oppretter en bok og sender deg rett inn i den", async () => {
    const { user } = await makeKokebok();
    hoisted.userId = user.id;

    const feil = await opprettBok(skjema("Mormors arvegods")).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:\/kokebok\//);

    const bøker = await db.select().from(cookbook).where(eq(cookbook.name, "Mormors arvegods"));
    expect(bøker).toHaveLength(1);
    expect(bøker[0].userId).toBe(user.id);
  });

  it("døper om sin egen bok — men ikke andres", async () => {
    const { user, bok } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    await endreBokNavn(bok.id, skjema("Bakeboken"));
    await endreBokNavn(annen.bok.id, skjema("Kuppet bok"));

    const min = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.min");
    const andres = await db.select().from(cookbook).where(eq(cookbook.id, annen.bok.id)).single("test.andres");
    expect(min.name).toBe("Bakeboken");
    expect(andres.name).toBe("Testkokeboka");
  });

  it("nye kapitler legges bakerst i sin egen bok", async () => {
    const { user, bok } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    await nyttKapittel(bok.id, skjema("Desserter"));
    await nyttKapittel(bok.id, skjema("Middag"));
    await nyttKapittel(annen.bok.id, skjema("Snik-kapittel"));

    const mine = await db.select().from(chapters).where(eq(chapters.cookbookId, bok.id)).orderBy(asc(chapters.order));
    expect(mine.map((k) => [k.name, k.order])).toEqual([["Gjærbakst", 1], ["Desserter", 2], ["Middag", 3]]);

    const andres = await db.select().from(chapters).where(eq(chapters.cookbookId, annen.bok.id));
    expect(andres.map((k) => k.name)).toEqual(["Gjærbakst"]);
  });

  it("avviser tomme navn", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    await endreBokNavn(bok.id, skjema("   "));

    const rad = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.tomt");
    expect(rad.name).toBe("Testkokeboka");
  });
});
