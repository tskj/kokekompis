// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cookbook, users } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb } from "./db";
import "./rtl";
import { cleanup, render, screen, within } from "./rtl";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({
  auth:    vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)),
  signIn:  vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect:  vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound:  vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  useParams: vi.fn(() => ({})),
}));

import { flyttBokPåHylla, settHylleSortering, lagreHylleRekkefølge } from "@/app/actions/bok";
import Home from "@/app/page";
import CookbookLayout from "@/app/kokebok/[id]/layout";

// Tre bøker på samme hylle, navngitt så navnesorteringen er kjent.
async function lagHylle() {
  const { user, bok } = await makeKokebok();
  await db.update(cookbook).set({ name: "Bakst" }).where(eq(cookbook.id, bok.id));

  const [middag, kaker] = await db
    .insert(cookbook)
    .values([
      { userId: user.id, name: "Middag" },
      { userId: user.id, name: "Kaker" },
    ])
    .returning();

  return { user, bakst: bok, middag, kaker };
}

async function hylleRekkefølge(): Promise<string[]> {
  const hylle = screen.getByRole("region", { name: "Bokhylla" });
  const lenker = within(hylle).getAllByRole("link").filter((lenke) => lenke.getAttribute("href")?.startsWith("/kokebok/"));

  return lenker.map((lenke) => lenke.textContent?.replace("Kokekompis", "").trim() ?? "");
}

describe("bokhylla kan sorteres — egen rekkefølge og sist åpnet", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("pilene bytter plass på bøkene — og hylla følger din rekkefølge", async () => {
    const { user, kaker } = await lagHylle();
    hoisted.userId = user.id;

    // usortert står hylla i navnerekkefølge
    render(await Home());
    expect(await hylleRekkefølge()).toEqual(["Bakst", "Kaker", "Middag"]);

    // Kaker mot venstre — forbi Bakst; i toppen er nok et venstretrykk no-op
    await flyttBokPåHylla(kaker.id, "venstre", new FormData());
    await flyttBokPåHylla(kaker.id, "venstre", new FormData());

    cleanup();
    render(await Home());
    expect(await hylleRekkefølge()).toEqual(["Kaker", "Bakst", "Middag"]);
  });

  it("trykk-og-dra lagrer hele rekkefølgen i ett — fremmede ids preller av", async () => {
    const { user, bakst, middag, kaker } = await lagHylle();
    const fremmed = await makeKokebok();
    hoisted.userId = user.id;

    await lagreHylleRekkefølge([middag.id, fremmed.bok.id, kaker.id, bakst.id]);

    render(await Home());
    expect(await hylleRekkefølge()).toEqual(["Middag", "Kaker", "Bakst"]);

    // den fremmede boken sto aldri på min hylle — og dens rekkefølge er urørt
    const andres = await db.select().from(cookbook).where(eq(cookbook.id, fremmed.bok.id)).single("test.andres");
    expect(andres.rekkefølge).toBeNull();
  });

  it("sortering bytter aldri farge på bøkene — fargen følger boken, ikke plassen", async () => {
    const { user, bakst, kaker } = await lagHylle();
    hoisted.userId = user.id;

    render(await Home());
    const hylle = screen.getByRole("region", { name: "Bokhylla" });
    const førKlasse = within(hylle).getByRole("link", { name: /Bakst/ }).className;

    cleanup();
    await lagreHylleRekkefølge([kaker.id, bakst.id]);

    render(await Home());
    const etterHylle = screen.getByRole("region", { name: "Bokhylla" });
    expect(within(etterHylle).getByRole("link", { name: /Bakst/ }).className).toBe(førKlasse);
  });

  it("en fremmed rokkerer ikke hylla di", async () => {
    const { kaker } = await lagHylle();
    const fremmed = await makeKokebok();
    hoisted.userId = fremmed.user.id;

    await flyttBokPåHylla(kaker.id, "venstre", new FormData());

    const rad = await db.select().from(cookbook).where(eq(cookbook.id, kaker.id)).single("test.urørt");
    expect(rad.rekkefølge).toBeNull();
  });

  it("«sist åpnet» sorterer etter når du slo opp i boken — og valget huskes på brukeren", async () => {
    const { user, bakst, middag } = await lagHylle();
    hoisted.userId = user.id;

    await settHylleSortering((() => { const f = new FormData(); f.set("sortering", "sist-åpnet"); return f; })());
    expect((await db.select().from(users).where(eq(users.id, user.id)).single("test.pref")).hylleSortering).toBe("sist-åpnet");

    // å åpne boken er det som flytter den fremst
    await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(middag.id) }) });
    await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bakst.id) }) });

    render(await Home());
    expect(await hylleRekkefølge()).toEqual(["Bakst", "Middag", "Kaker"]);
  });

  it("tull i sorteringsvalget preller av", async () => {
    const { user } = await makeKokebok();
    hoisted.userId = user.id;

    const skjema = new FormData();
    skjema.set("sortering", "baklengs");
    await settHylleSortering(skjema);

    const rad = await db.select().from(users).where(eq(users.id, user.id)).single("test.standard");
    expect(rad.hylleSortering).toBe("egen");
  });

  it("gjester setter aldri bokmerke — sistÅpnet tilhører eieren", async () => {
    const { user, bok } = await makeKokebok({ synlighet: "utstilt" });
    const fremmed = await makeKokebok();

    hoisted.userId = fremmed.user.id;
    await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bok.id) }) });
    expect((await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.gjest")).sistÅpnet).toBeNull();

    hoisted.userId = user.id;
    await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bok.id) }) });
    expect((await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.eier")).sistÅpnet).not.toBeNull();
  });
});
