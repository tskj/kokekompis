// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, recipeChapters, recipeFavorites, recipeLinks, recipes } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { uuidHref } from "@/lib/uuid/uuid-links";
import { makeKokebok, resetDb, testOppskrift } from "./db";
import "./rtl";
import { cleanup, render, screen, userEvent, waitFor } from "./rtl";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

import RecipePage from "@/app/kokebok/[id]/@recipe/oppskrift/[recipeid]/page";

function sideProps(bokId: string, oppskriftId: string, søk: Record<string, string> = {}) {
  return {
    params: Promise.resolve({ id: encodeUuidToBase32(bokId), recipeid: encodeUuidToBase32(oppskriftId) }),
    searchParams: Promise.resolve(søk),
  };
}

describe("oppskriftssiden (ekte side rendret mot ekte database)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("viser oppskriften: infolinje, ingredienser, steg, opprinnelse og lapper", async () => {
    const { user, bok, oppskrift } = await makeKokebok({ title: "Testboller" });
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id)));

    expect(screen.getByRole("heading", { name: "Testboller" })).toBeInTheDocument();
    expect(screen.getByText("Fra start til spiseklart")).toBeInTheDocument();
    expect(screen.getByText("2 t")).toBeInTheDocument();
    expect(screen.getByText("hvetemel")).toBeInTheDocument();
    expect(screen.getByText("9 dl")).toBeInTheDocument();
    expect(screen.getByText("Elt sammen mel og sukker.")).toBeInTheDocument();
    expect(screen.getByText(/heving — ca\. 1 t/)).toBeInTheDocument();
    expect(screen.getByText(/Fra Mormor/)).toBeInTheDocument();
    expect(screen.getByText("ny lapp")).toBeInTheDocument();
  });

  it("?enheter=gram konverterer mormors dl til gram, med originalen i parentes", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id, { enheter: "gram" })));

    expect(screen.getByText("540 g")).toBeInTheDocument();
    expect(screen.getByText("(9 dl)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "som skrevet" })).toBeInTheDocument();
  });

  it("?tilbake viser veien hjem — hoppet til en lenket oppskrift mister aldri stedet sitt", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const tilbake = "/kokebok/abc/oppskrift/xyz";
    render(await RecipePage(sideProps(bok.id, oppskrift.id, { tilbake })));

    const lenke = screen.getByRole("link", { name: "← Tilbake dit du var" });
    expect(lenke).toHaveAttribute("href", tilbake);
  });

  it("hjertet favoriserer via ekte action — og avfavoriserer ved nytt trykk", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    const bruker = userEvent.setup();

    await bruker.click(screen.getByRole("button", { name: "Merk som favoritt" }));
    await waitFor(async () => {
      const rader = await db.select().from(recipeFavorites).where(eq(recipeFavorites.recipeId, oppskrift.id));
      expect(rader).toHaveLength(1);
    });

    // re-render fra databasen: nå er den favoritt, og ett trykk til fjerner den
    cleanup();
    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    await bruker.click(screen.getByRole("button", { name: "Fjern fra favoritter" }));
    await waitFor(async () => {
      const rader = await db.select().from(recipeFavorites).where(eq(recipeFavorites.recipeId, oppskrift.id));
      expect(rader).toHaveLength(0);
    });
  });

  it("lenker to oppskrifter via skjemaet — og baklenken vises hos den andre", async () => {
    const { user, bok, oppskrift } = await makeKokebok({ title: "Skoleboller" });
    hoisted.userId = user.id;

    const vaniljekrem = await db
      .insert(recipes)
      .values({ userId: user.id, cookbookId: bok.id, title: "Vaniljekrem", description: null, content: testOppskrift() })
      .returning()
      .single("test.vaniljekrem");

    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    const bruker = userEvent.setup();

    await bruker.click(screen.getByText("+ lenk til en oppskrift"));
    await bruker.selectOptions(screen.getByLabelText("Oppskrift å lenke til"), "Vaniljekrem");
    await bruker.click(screen.getByRole("button", { name: "Lenk" }));

    await waitFor(async () => {
      const lenker = await db.select().from(recipeLinks).where(eq(recipeLinks.fromRecipeId, oppskrift.id));
      expect(lenker).toHaveLength(1);
      expect(lenker[0].toRecipeId).toBe(vaniljekrem.id);
    });

    // skolebollene viser lenken videre — med tilbake-sti i URL-en
    cleanup();
    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    const tilLenke = screen.getByRole("link", { name: "Vaniljekrem →" });
    expect(tilLenke.getAttribute("href")).toContain("tilbake=");

    // vaniljekremen vet hvor den brukes
    cleanup();
    render(await RecipePage(sideProps(bok.id, vaniljekrem.id)));
    expect(screen.getByText("Brukes i:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skoleboller" })).toBeInTheDocument();
  });

  it("flytter oppskriften til et annet kapittel — og til ukategorisert", async () => {
    const { user, bok, kapittel, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const desserter = await db
      .insert(chapters)
      .values({ cookbookId: bok.id, name: "Desserter", order: 2 })
      .returning()
      .single("test.desserter");

    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    const bruker = userEvent.setup();

    await bruker.selectOptions(screen.getByLabelText("Kapittel"), "Desserter");
    await bruker.click(screen.getByRole("button", { name: "Flytt" }));

    await waitFor(async () => {
      const rader = await db.select().from(recipeChapters).where(eq(recipeChapters.recipeId, oppskrift.id));
      expect(rader).toHaveLength(1);
      expect(rader[0].chapterId).toBe(desserter.id);
    });

    // og så helt ut av kapitlene
    cleanup();
    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    await bruker.selectOptions(screen.getByLabelText("Kapittel"), "Ukategorisert");
    await bruker.click(screen.getByRole("button", { name: "Flytt" }));

    await waitFor(async () => {
      const rader = await db.select().from(recipeChapters).where(eq(recipeChapters.recipeId, oppskrift.id));
      expect(rader).toHaveLength(0);
    });

    // ukategorisert er fortsatt fullt tilgjengelig på sin side i boken
    cleanup();
    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    expect(screen.getByRole("heading", { name: "Testboller" })).toBeInTheDocument();

    void kapittel;
  });

  it("404-er for en oppskrift som ikke hører til boken", async () => {
    const { user, bok } = await makeKokebok();
    const annen = await makeKokebok({ title: "Annen manns suppe" });
    hoisted.userId = user.id;

    await expect(RecipePage(sideProps(bok.id, annen.oppskrift.id))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("har lenke til bakeview og redigering", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id)));

    const bakLenke = screen.getByRole("link", { name: /Sett i gang/ });
    expect(bakLenke.getAttribute("href")).toContain(uuidHref`/bak/${oppskrift.id}`);

    const redigerLenke = screen.getByRole("link", { name: "Rediger" });
    expect(redigerLenke.getAttribute("href")).toContain("/rediger");
  });
});
