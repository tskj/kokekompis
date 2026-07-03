import { beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipes, recipeNotes } from "@/lib/db/schema";
import { makeKokebok, resetDb } from "./db";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { settPrøvd, nullstillPrøvd, gjenopprettFraArkiv } from "@/app/actions/provd";

function prøvdSkjema(likte: string, skjebne: string, innspill = ""): FormData {
  const formData = new FormData();
  formData.set("likte", likte);
  formData.set("skjebne", skjebne);
  formData.set("innspill", innspill);

  return formData;
}

describe("prøvd-flyten (ekte actions, ekte database)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("prøvd og likt: status settes, innspillet blir en lapp festet oppe", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    await settPrøvd(oppskrift.id, prøvdSkjema("ja", "behold", "mindre sukker neste gang"));

    const rad = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.prøvd");
    expect(rad.prøvd).not.toBeNull();
    expect(rad.likte).toBe(true);
    expect(rad.arkivert).toBeNull();

    const lapper = await db
      .select()
      .from(recipeNotes)
      .where(and(eq(recipeNotes.recipeId, oppskrift.id), eq(recipeNotes.userId, user.id)));
    expect(lapper).toHaveLength(1);
    expect(lapper[0].tekst).toBe("mindre sukker neste gang");
    expect(lapper[0].plass).toBe("oppe");
  });

  it("falt ikke i smak → arkivet; gjenoppretting beholder prøvd-statusen; nullstilling visker alt", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    await settPrøvd(oppskrift.id, prøvdSkjema("nei", "arkiver"));

    let rad = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.arkivert");
    expect(rad.likte).toBe(false);
    expect(rad.arkivert).not.toBeNull();

    await gjenopprettFraArkiv(oppskrift.id, new FormData());
    rad = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.gjenopprettet");
    expect(rad.arkivert).toBeNull();
    expect(rad.prøvd).not.toBeNull();

    await nullstillPrøvd(oppskrift.id, new FormData());
    rad = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.nullstilt");
    expect(rad.prøvd).toBeNull();
    expect(rad.likte).toBeNull();
  });

  it("fremmede setter aldri prøvd-status på dine oppskrifter — og tull i skjemaet preller av", async () => {
    const { oppskrift } = await makeKokebok();
    const fremmed = await makeKokebok();

    hoisted.userId = fremmed.user.id;
    await settPrøvd(oppskrift.id, prøvdSkjema("ja", "behold"));

    hoisted.userId = oppskrift.userId;
    await settPrøvd(oppskrift.id, prøvdSkjema("kanskje", "behold"));

    const rad = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.urørt");
    expect(rad.prøvd).toBeNull();
  });
});
