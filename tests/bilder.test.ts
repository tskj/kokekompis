import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipes, recipeContentSchema } from "@/lib/db/schema";
import { makeKokebok, resetDb } from "./db";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { lastOppRettBilde, slettRettBilde } from "@/app/actions/bilder";

async function testPng(bredde: number): Promise<File> {
  const bytes = await sharp({
    create: { width: bredde, height: Math.round(bredde / 2), channels: 3, background: { r: 180, g: 80, b: 40 } },
  }).png().toBuffer();

  return new File([new Uint8Array(bytes)], "rett.png", { type: "image/png" });
}

describe("rettbilder (ekte sharp-pipeline, disk-backend, ekte database)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
    vi.stubEnv("LOKAL_LAGRING_DIR", await mkdtemp(path.join(tmpdir(), "kokekompis-lagring-")));
  });

  it("laster opp, skalerer ned til webp, og legger nøkkelen i ferdigprodukt.bilder", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const formData = new FormData();
    formData.set("bilde", await testPng(2400));
    await lastOppRettBilde(oppskrift.id, formData);

    const rad = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.bilde");
    const content = recipeContentSchema.parse(rad.content);
    expect(content.ferdigprodukt.bilder).toHaveLength(1);

    const key = content.ferdigprodukt.bilder[0];
    expect(key).toMatch(new RegExp(`^oppskrift/${oppskrift.id}/[0-9a-f-]+\\.webp$`));

    // filen ligger der, er webp, og langsiden er skalert ned til 1600
    const fil = path.join(process.env.LOKAL_LAGRING_DIR!, key);
    const meta = await sharp(fil).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1600);
  });

  it("sletting fjerner både nøkkelen og filen", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const formData = new FormData();
    formData.set("bilde", await testPng(400));
    await lastOppRettBilde(oppskrift.id, formData);

    const rad = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.bilde");
    const key = recipeContentSchema.parse(rad.content).ferdigprodukt.bilder[0];

    await slettRettBilde(oppskrift.id, key, new FormData());

    const etter = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.bilde2");
    expect(recipeContentSchema.parse(etter.content).ferdigprodukt.bilder).toHaveLength(0);

    const filer = await readdir(path.join(process.env.LOKAL_LAGRING_DIR!, "oppskrift", oppskrift.id)).catch(() => []);
    expect(filer).toHaveLength(0);
  });

  it("avviser ting som ikke er bilder", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const formData = new FormData();
    formData.set("bilde", new File(["#!/bin/sh"], "skummel.sh", { type: "text/x-shellscript" }));
    await lastOppRettBilde(oppskrift.id, formData);

    const rad = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.bilde3");
    expect(recipeContentSchema.parse(rad.content).ferdigprodukt.bilder).toHaveLength(0);
  });
});
