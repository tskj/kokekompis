import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipeKategorier } from "@/lib/db/schema";
import { makeKokebok, resetDb } from "./db";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { leggTilKategori, fjernKategori } from "@/app/actions/kategorier";

function skjema(navn: string): FormData {
  const formData = new FormData();
  formData.set("navn", navn);

  return formData;
}

describe("kategorier — merker på tvers av bøkene (ekte actions, ekte database)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("setter merket med normalisert navn — «Suppe» og «suppe» er samme kategori", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    await leggTilKategori(oppskrift.id, skjema("  Suppe "));
    await leggTilKategori(oppskrift.id, skjema("suppe"));

    const merker = await db.select().from(recipeKategorier).where(eq(recipeKategorier.recipeId, oppskrift.id));
    expect(merker).toHaveLength(1);
    expect(merker[0].navn).toBe("suppe");
  });

  it("fjerner sitt eget merke — fremmede verken setter eller fjerner", async () => {
    const { user, oppskrift } = await makeKokebok();
    const fremmed = await makeKokebok();

    hoisted.userId = fremmed.user.id;
    await leggTilKategori(oppskrift.id, skjema("pai"));
    expect(await db.select().from(recipeKategorier).where(eq(recipeKategorier.recipeId, oppskrift.id))).toHaveLength(0);

    hoisted.userId = user.id;
    await leggTilKategori(oppskrift.id, skjema("pai"));
    const [merke] = await db.select().from(recipeKategorier).where(eq(recipeKategorier.recipeId, oppskrift.id));

    hoisted.userId = fremmed.user.id;
    await fjernKategori(merke.id, new FormData());
    expect(await db.select().from(recipeKategorier).where(eq(recipeKategorier.id, merke.id))).toHaveLength(1);

    hoisted.userId = user.id;
    await fjernKategori(merke.id, new FormData());
    expect(await db.select().from(recipeKategorier).where(eq(recipeKategorier.id, merke.id))).toHaveLength(0);
  });
});
