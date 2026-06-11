import { beforeEach, describe, expect, it, vi } from "vitest";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, cookbook, recipes, recipeChapters, recipeLinks } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb, testOppskrift } from "./db";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

import { endreKapittelNavn, flyttKapittel, flyttKapittelTilBok, flyttOppskriftIKapittel } from "@/app/actions/kapittel";

function skjema(felt: string, verdi: string): FormData {
  const formData = new FormData();
  formData.set(felt, verdi);

  return formData;
}

async function kapittelNavnIRekkefølge(bokId: string): Promise<string[]> {
  const rader = await db
    .select({ name: chapters.name })
    .from(chapters)
    .where(eq(chapters.cookbookId, bokId))
    .orderBy(asc(chapters.order));

  return rader.map((rad) => rad.name);
}

describe("kapittel-stell (ekte actions, ekte database)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("døper om sitt eget kapittel — men ikke andres", async () => {
    const { user, kapittel } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    await endreKapittelNavn(kapittel.id, skjema("navn", "Søt gjærbakst"));
    await endreKapittelNavn(annen.kapittel.id, skjema("navn", "Kuppet kapittel"));

    const mitt = await db.select().from(chapters).where(eq(chapters.id, kapittel.id)).single("test.mitt");
    const andres = await db.select().from(chapters).where(eq(chapters.id, annen.kapittel.id)).single("test.andres");
    expect(mitt.name).toBe("Søt gjærbakst");
    expect(andres.name).toBe("Gjærbakst");
  });

  it("bytter plass med naboen — og er no-op øverst og nederst", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    hoisted.userId = user.id;

    await db.insert(chapters).values([
      { cookbookId: bok.id, name: "Kaker", order: 2 },
      { cookbookId: bok.id, name: "Middag", order: 3 },
    ]);

    const kaker = await db.select().from(chapters).where(eq(chapters.name, "Kaker")).single("test.kaker");

    await flyttKapittel(kaker.id, "opp", new FormData());
    expect(await kapittelNavnIRekkefølge(bok.id)).toEqual(["Kaker", "Gjærbakst", "Middag"]);

    await flyttKapittel(kaker.id, "opp", new FormData());
    expect(await kapittelNavnIRekkefølge(bok.id)).toEqual(["Kaker", "Gjærbakst", "Middag"]);

    await flyttKapittel(kaker.id, "ned", new FormData());
    expect(await kapittelNavnIRekkefølge(bok.id)).toEqual(["Gjærbakst", "Kaker", "Middag"]);

    void kapittel;
  });

  it("en fremmed får ikke sortert kapitlene dine", async () => {
    const { bok } = await makeKokebok();
    const fremmed = await makeKokebok();
    hoisted.userId = fremmed.user.id;

    await db.insert(chapters).values({ cookbookId: bok.id, name: "Kaker", order: 2 });
    const kaker = await db.select().from(chapters).where(eq(chapters.name, "Kaker")).single("test.kaker");

    await flyttKapittel(kaker.id, "opp", new FormData());
    expect(await kapittelNavnIRekkefølge(bok.id)).toEqual(["Gjærbakst", "Kaker"]);
  });

  it("sorterer oppskriftene innad i kapittelet", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    hoisted.userId = user.id;

    const [krem, kake] = await db
      .insert(recipes)
      .values([
        { userId: user.id, cookbookId: bok.id, title: "Vaniljekrem", description: null, content: testOppskrift() },
        { userId: user.id, cookbookId: bok.id, title: "Bløtkake",    description: null, content: testOppskrift() },
      ])
      .returning();
    await db.insert(recipeChapters).values([
      { recipeId: krem.id, chapterId: kapittel.id, order: 2 },
      { recipeId: kake.id, chapterId: kapittel.id, order: 3 },
    ]);

    await flyttOppskriftIKapittel(kapittel.id, kake.id, "opp", new FormData());

    const rekkefølge = await db
      .select({ tittel: recipes.title })
      .from(recipeChapters)
      .innerJoin(recipes, eq(recipeChapters.recipeId, recipes.id))
      .where(eq(recipeChapters.chapterId, kapittel.id))
      .orderBy(asc(recipeChapters.order));
    expect(rekkefølge.map((rad) => rad.tittel)).toEqual(["Testboller", "Bløtkake", "Vaniljekrem"]);
  });

  it("flytter hele kapittelet til en annen av dine bøker — oppskriftene følger med, kryssende koblinger ryker", async () => {
    const { user, bok, kapittel, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const bokB = await db
      .insert(cookbook)
      .values({ userId: user.id, name: "Bok B" })
      .returning()
      .single("test.bokB");
    await db.insert(chapters).values({ cookbookId: bokB.id, name: "Allerede her", order: 1 });

    // en oppskrift som blir igjen i gamleboken, lenket fra den som flytter
    const igjen = await db
      .insert(recipes)
      .values({ userId: user.id, cookbookId: bok.id, title: "Vaniljekrem", description: null, content: testOppskrift() })
      .returning()
      .single("test.igjen");
    await db.insert(recipeLinks).values({ fromRecipeId: oppskrift.id, toRecipeId: igjen.id });

    // den flyttende oppskriften står også i et annet kapittel i gamleboken
    const kaker = await db
      .insert(chapters)
      .values({ cookbookId: bok.id, name: "Kaker", order: 2 })
      .returning()
      .single("test.kaker");
    await db.insert(recipeChapters).values({ recipeId: oppskrift.id, chapterId: kaker.id, order: 1 });

    await flyttKapittelTilBok(kapittel.id, skjema("bok", encodeUuidToBase32(bokB.id)));

    // kapittelet står bakerst i bok B, og oppskriften eies nå av bok B
    const flyttet = await db.select().from(chapters).where(eq(chapters.id, kapittel.id)).single("test.flyttet");
    expect(flyttet.cookbookId).toBe(bokB.id);
    expect(flyttet.order).toBe(2);

    const bolle = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.bolle");
    expect(bolle.cookbookId).toBe(bokB.id);

    // koblingen til "Kaker" i gamleboken og lenken på tvers av bøkene er borte
    const kakerKoblinger = await db.select().from(recipeChapters).where(eq(recipeChapters.chapterId, kaker.id));
    expect(kakerKoblinger).toHaveLength(0);

    const lenker = await db.select().from(recipeLinks).where(eq(recipeLinks.fromRecipeId, oppskrift.id));
    expect(lenker).toHaveLength(0);

    // vaniljekremen ble igjen der den sto
    const kremen = await db.select().from(recipes).where(eq(recipes.id, igjen.id)).single("test.kremen");
    expect(kremen.cookbookId).toBe(bok.id);
  });

  it("flytter aldri til en bok du ikke eier — og aldri andres kapitler", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    const annen = await makeKokebok();

    hoisted.userId = user.id;
    await flyttKapittelTilBok(kapittel.id, skjema("bok", encodeUuidToBase32(annen.bok.id)));

    hoisted.userId = annen.user.id;
    await flyttKapittelTilBok(kapittel.id, skjema("bok", encodeUuidToBase32(annen.bok.id)));

    const urørt = await db.select().from(chapters).where(eq(chapters.id, kapittel.id)).single("test.urørt");
    expect(urørt.cookbookId).toBe(bok.id);
  });
});
