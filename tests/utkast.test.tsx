// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipes, recipeComments, recipeContentSchema } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb, testOppskrift } from "./db";
import "./rtl";
import { cleanup, render, screen, userEvent, waitFor } from "./rtl";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect:  vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound:  vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  useParams: vi.fn(() => ({})),
}));

import { lagUtkast, taIBrukUtkast, forkastUtkast } from "@/app/actions/utkast";
import { leggTilKommentar, slettKommentar } from "@/app/actions/kommentarer";
import RecipePage from "@/app/kokebok/[id]/@recipe/oppskrift/[recipeid]/page";
import CookbookLayout from "@/app/kokebok/[id]/layout";

function sideProps(bokId: string, oppskriftId: string) {
  return {
    params: Promise.resolve({ id: encodeUuidToBase32(bokId), recipeid: encodeUuidToBase32(oppskriftId) }),
    searchParams: Promise.resolve({}),
  };
}

async function lagUtkastOgFinnId(originalId: string): Promise<string> {
  const feil = await lagUtkast(originalId, new FormData()).then(() => null, (e: Error) => e);
  expect(feil?.message).toMatch(/^NEXT_REDIRECT:/);

  const utkast = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(eq(recipes.utkastAv, originalId))
    .single("test.utkast");

  return utkast.id;
}

describe("utkast (eksperimentkopier) og marg-kommentarer", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("lager et utkast — en kopi merket med originalen, og sender deg dit", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const utkastId = await lagUtkastOgFinnId(oppskrift.id);

    const utkast = await db.select().from(recipes).where(eq(recipes.id, utkastId)).single("test.kopi");
    expect(utkast.title).toBe("Testboller");
    expect(utkast.utkastAv).toBe(oppskrift.id);
    expect(utkast.content).toEqual(oppskrift.content);
  });

  it("utkast står utenfor innholdslista — men på benken på originalens side", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    await lagUtkastOgFinnId(oppskrift.id);

    render(await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bok.id) }) }));
    expect(screen.queryByText("Ukategorisert")).not.toBeInTheDocument();

    cleanup();
    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    expect(screen.getByText("På benken:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "utkast 1" })).toBeInTheDocument();
  });

  it("utkastsiden har banner og verken deling, flytting eller favoritt", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const utkastId = await lagUtkastOgFinnId(oppskrift.id);

    render(await RecipePage(sideProps(bok.id, utkastId)));
    expect(screen.getByText(/Et utkast/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ta i bruk/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Forkast utkastet" })).toBeInTheDocument();
    expect(screen.queryByText("Del oppskriften")).not.toBeInTheDocument();
    expect(screen.queryByText("Flytt …")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Merk som favoritt" })).not.toBeInTheDocument();
  });

  it("å ta i bruk utkastet skriver over originalen og rydder benken", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const utkastId = await lagUtkastOgFinnId(oppskrift.id);
    await db
      .update(recipes)
      .set({ title: "Testboller med mindre egg", content: testOppskrift({ info: { ...testOppskrift().info, porsjoner: { antall: 24, benevnelse: "boller" } } }) })
      .where(eq(recipes.id, utkastId));

    const feil = await taIBrukUtkast(utkastId, new FormData()).then(() => null, (e: Error) => e);
    expect(feil?.message).toContain(encodeUuidToBase32(oppskrift.id));

    const original = await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).single("test.original");
    expect(original.title).toBe("Testboller med mindre egg");
    expect(recipeContentSchema.parse(original.content).info.porsjoner.antall).toBe(24);

    expect(await db.select().from(recipes).where(eq(recipes.id, utkastId))).toHaveLength(0);
  });

  it("å forkaste utkastet sletter bare utkastet — og fremmede får verken laget eller tatt i bruk", async () => {
    const { user, oppskrift } = await makeKokebok();
    const annen = await makeKokebok();

    hoisted.userId = annen.user.id;
    await lagUtkast(oppskrift.id, new FormData());
    expect(await db.select().from(recipes).where(eq(recipes.utkastAv, oppskrift.id))).toHaveLength(0);

    hoisted.userId = user.id;
    const utkastId = await lagUtkastOgFinnId(oppskrift.id);

    hoisted.userId = annen.user.id;
    await taIBrukUtkast(utkastId, new FormData());
    await forkastUtkast(utkastId, new FormData());
    expect(await db.select().from(recipes).where(eq(recipes.id, utkastId))).toHaveLength(1);

    hoisted.userId = user.id;
    const feil = await forkastUtkast(utkastId, new FormData()).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:/);
    expect(await db.select().from(recipes).where(eq(recipes.id, utkastId))).toHaveLength(0);
    expect(await db.select().from(recipes).where(eq(recipes.id, oppskrift.id))).toHaveLength(1);
  });

  it("henger en kommentar på et steg via skjemaet — og den står under steget", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    const bruker = userEvent.setup();

    // tre steg → tre kommentarfelter; heng kommentaren på det første
    await bruker.click(screen.getAllByText("+ kommentar")[0]);
    await bruker.type(screen.getAllByLabelText("Kommentar til steget")[0], "oi — denne ble svidd i kantene, prøv mindre egg");
    await bruker.click(screen.getAllByRole("button", { name: "Heng på" })[0]);

    await waitFor(async () => {
      const rader = await db.select().from(recipeComments).where(eq(recipeComments.recipeId, oppskrift.id));
      expect(rader).toHaveLength(1);
      expect(rader[0].stegId).toBe("elt");
      expect(rader[0].userId).toBe(user.id);
    });

    cleanup();
    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    expect(screen.getByText("oi — denne ble svidd i kantene, prøv mindre egg")).toBeInTheDocument();
  });

  it("avviser kommentarer på steg som ikke finnes — og sletter bare dine egne", async () => {
    const { user, oppskrift } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    const skjema = new FormData();
    skjema.set("tekst", "hører ingen steder hjemme");
    await leggTilKommentar(oppskrift.id, "finnes-ikke", skjema);
    expect(await db.select().from(recipeComments).where(eq(recipeComments.recipeId, oppskrift.id))).toHaveLength(0);

    skjema.set("tekst", "prøv 12 minutter");
    await leggTilKommentar(oppskrift.id, "elt", skjema);
    const kommentar = await db
      .select({ id: recipeComments.id })
      .from(recipeComments)
      .where(eq(recipeComments.recipeId, oppskrift.id))
      .single("test.kommentar");

    hoisted.userId = annen.user.id;
    await slettKommentar(kommentar.id, new FormData());
    expect(await db.select().from(recipeComments).where(eq(recipeComments.id, kommentar.id))).toHaveLength(1);

    hoisted.userId = user.id;
    await slettKommentar(kommentar.id, new FormData());
    expect(await db.select().from(recipeComments).where(eq(recipeComments.id, kommentar.id))).toHaveLength(0);
  });
});
