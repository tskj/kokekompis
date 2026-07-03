import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cookbook, recipes, recipeChapters, recipeLinks } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb } from "./db";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

import { flyttOppskrift } from "@/app/actions/organisering";
import { lenkOppskrifter } from "@/app/actions/lenker";

function skjema(felt: string, verdi: string): FormData {
  const formData = new FormData();
  formData.set(felt, verdi);

  return formData;
}

describe("flytting mellom bøker (ekte actions, ekte database)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("flytter oppskriften til en annen av mine bøker — ut av kapitlene, utkastene følger med", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const målBok = await db
      .insert(cookbook)
      .values({ userId: user.id, name: "Ny bok" })
      .returning()
      .single("test.målbok");

    const utkast = await db
      .insert(recipes)
      .values({ userId: user.id, cookbookId: oppskrift.cookbookId, title: "Utkast", content: oppskrift.content, utkastAv: oppskrift.id })
      .returning()
      .single("test.utkast");

    // flyttingen ender i redirect til oppskriften i den nye boken
    await expect(flyttOppskrift(oppskrift.id, skjema("kapittel", `bok:${encodeUuidToBase32(målBok.id)}`)))
      .rejects.toThrow("NEXT_REDIRECT");

    const flyttet     = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.flyttet");
    const utkastEtter = await db.select().from(recipes).where(eq(recipes.id, utkast.id)).single("test.utkast-etter");
    expect(flyttet.cookbookId).toBe(målBok.id);
    expect(utkastEtter.cookbookId).toBe(målBok.id);

    const kapittelLenker = await db.select().from(recipeChapters).where(eq(recipeChapters.recipeId, oppskrift.id));
    expect(kapittelLenker).toHaveLength(0);
  });

  it("nekter å flytte til en bok som ikke er min — og til arkiverte bøker", async () => {
    const { user, oppskrift } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    await flyttOppskrift(oppskrift.id, skjema("kapittel", `bok:${encodeUuidToBase32(annen.bok.id)}`));

    const etterFremmed = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.fremmed");
    expect(etterFremmed.cookbookId).toBe(oppskrift.cookbookId);

    const arkivert = await db
      .insert(cookbook)
      .values({ userId: user.id, name: "Bortlagt", arkivert: new Date("2026-01-01") })
      .returning()
      .single("test.arkivert");

    await flyttOppskrift(oppskrift.id, skjema("kapittel", `bok:${encodeUuidToBase32(arkivert.id)}`));

    const etterArkivert = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.arkivert-etter");
    expect(etterArkivert.cookbookId).toBe(oppskrift.cookbookId);
  });

  it("lenker på tvers av mine bøker — men aldri til andres oppskrifter", async () => {
    const { user, oppskrift } = await makeKokebok();
    const fremmed = await makeKokebok();
    hoisted.userId = user.id;

    const målBok = await db
      .insert(cookbook)
      .values({ userId: user.id, name: "Grunnoppskrifter" })
      .returning()
      .single("test.grunnbok");
    const vaniljekrem = await db
      .insert(recipes)
      .values({ userId: user.id, cookbookId: målBok.id, title: "Vaniljekrem", content: oppskrift.content })
      .returning()
      .single("test.vaniljekrem");

    await lenkOppskrifter(oppskrift.id, skjema("til", encodeUuidToBase32(vaniljekrem.id)));
    await lenkOppskrifter(oppskrift.id, skjema("til", encodeUuidToBase32(fremmed.oppskrift.id)));

    const lenker = await db.select().from(recipeLinks).where(eq(recipeLinks.fromRecipeId, oppskrift.id));
    expect(lenker).toHaveLength(1);
    expect(lenker[0].toRecipeId).toBe(vaniljekrem.id);
  });
});
