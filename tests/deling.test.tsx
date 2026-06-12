// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipeShares } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb } from "./db";
import "./rtl";
import { render, screen } from "./rtl";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

import { delOppskrift, delBok, leggDeltOppskriftIBok, leggDeltBokPåHylla } from "@/app/actions/deling";
import DeltSide from "@/app/delt/[token]/page";
import DeltBokSide from "@/app/delt-bok/[token]/page";
import { cookbook, cookbookShares, chapters, recipes, recipeChapters, recipeLinks, recipeContentSchema } from "@/lib/db/schema";
import { testOppskrift } from "./db";

async function delOgFåToken(recipeId: string): Promise<string> {
  const feil = await delOppskrift(recipeId).then(() => null, (e: Error) => e);

  expect(feil?.message).toMatch(/^NEXT_REDIRECT:\/delt\//);
  return feil!.message.replace("NEXT_REDIRECT:/delt/", "");
}

describe("deling (ekte actions, ekte database, ekte delingsside)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("å dele lager én lenke — og å dele igjen gir samme lenke", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const token1 = await delOgFåToken(oppskrift.id);
    const token2 = await delOgFåToken(oppskrift.id);
    expect(token1).toBe(token2);

    const rader = await db.select().from(recipeShares).where(eq(recipeShares.recipeId, oppskrift.id));
    expect(rader).toHaveLength(1);
    expect(encodeUuidToBase32(rader[0].id)).toBe(token1);
  });

  it("bare eieren kan dele — en annens oppskrift forblir udelt", async () => {
    const { oppskrift } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = annen.user.id;

    await delOppskrift(oppskrift.id);

    const rader = await db.select().from(recipeShares).where(eq(recipeShares.recipeId, oppskrift.id));
    expect(rader).toHaveLength(0);
  });

  it("delingssiden viser oppskriften med opprinnelsen — den følger alltid med", async () => {
    const { user, oppskrift } = await makeKokebok({ title: "Mormors skillingsboller" });
    hoisted.userId = user.id;
    const token = await delOgFåToken(oppskrift.id);

    render(await DeltSide({
      params: Promise.resolve({ token }),
      searchParams: Promise.resolve({}),
    }));

    expect(screen.getByRole("heading", { name: "Mormors skillingsboller" })).toBeInTheDocument();
    expect(screen.getByText(/Fra Mormor/)).toBeInTheDocument();
    expect(screen.getByText("Fra kjøkkenet på Sotra.")).toBeInTheDocument();
    expect(screen.getByText(/Delt fra/)).toBeInTheDocument();

    // personlige ting hører ikke hjemme på delingssiden
    expect(screen.queryByText("ny lapp")).not.toBeInTheDocument();
    expect(screen.queryByText(/bakeview/)).not.toBeInTheDocument();
  });

  it("delingssiden kan også vise gram — mottakeren har samme enhetsvalg", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;
    const token = await delOgFåToken(oppskrift.id);

    render(await DeltSide({
      params: Promise.resolve({ token }),
      searchParams: Promise.resolve({ enheter: "gram" }),
    }));

    // 9 dl hvetemel à 60 g/dl
    expect(screen.getByText("540 g")).toBeInTheDocument();
    expect(screen.getByText("(9 dl)")).toBeInTheDocument();
  });

  it("en delt oppskrift kan legges i en av mottakerens bøker — kopien blir deres", async () => {
    const giver = await makeKokebok({ title: "Mormors skillingsboller" });
    const mottaker = await makeKokebok();

    hoisted.userId = giver.user.id;
    await delOgFåToken(giver.oppskrift.id);
    const share = await db.select().from(recipeShares).where(eq(recipeShares.recipeId, giver.oppskrift.id)).single("test.share");

    hoisted.userId = mottaker.user.id;
    const skjema = new FormData();
    skjema.set("bok", encodeUuidToBase32(mottaker.bok.id));
    const feil = await leggDeltOppskriftIBok(share.id, skjema).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:/);

    const kopier = await db.select().from(recipes).where(eq(recipes.cookbookId, mottaker.bok.id));
    const kopi = kopier.find((rad) => rad.title === "Mormors skillingsboller");
    expect(kopi).toBeDefined();
    expect(kopi!.userId).toBe(mottaker.user.id);
    expect(kopi!.id).not.toBe(giver.oppskrift.id);

    // rettbildene blir hos giveren
    expect(recipeContentSchema.parse(kopi!.content).ferdigprodukt.bilder).toHaveLength(0);
  });

  it("delBok gir én stabil lenke — og bare eieren deler", async () => {
    const { user, bok } = await makeKokebok();
    const annen = await makeKokebok();

    hoisted.userId = annen.user.id;
    await delBok(bok.id, new FormData());
    expect(await db.select().from(cookbookShares).where(eq(cookbookShares.cookbookId, bok.id))).toHaveLength(0);

    hoisted.userId = user.id;
    await delBok(bok.id, new FormData()).catch(() => null);
    await delBok(bok.id, new FormData()).catch(() => null);
    expect(await db.select().from(cookbookShares).where(eq(cookbookShares.cookbookId, bok.id))).toHaveLength(1);
  });

  it("den delte boken leses uten innlogging — og kan legges på mottakerens hylle som full kopi", async () => {
    const giver = await makeKokebok({ title: "Skoleboller" });
    hoisted.userId = giver.user.id;

    // en ekstra oppskrift med se-også-lenke, så kopien har noe å oversette
    const krem = await db
      .insert(recipes)
      .values({ userId: giver.user.id, cookbookId: giver.bok.id, title: "Vaniljekrem", description: null, content: testOppskrift() })
      .returning()
      .single("test.krem");
    await db.insert(recipeLinks).values({ fromRecipeId: giver.oppskrift.id, toRecipeId: krem.id });

    await delBok(giver.bok.id, new FormData()).catch(() => null);
    const share = await db.select().from(cookbookShares).where(eq(cookbookShares.cookbookId, giver.bok.id)).single("test.bokshare");

    // utlogget gjest leser innholdet
    hoisted.userId = "";
    render(await DeltBokSide({ params: Promise.resolve({ token: encodeUuidToBase32(share.id) }) }));
    expect(screen.getByRole("heading", { name: "Testkokeboka" })).toBeInTheDocument();
    expect(screen.getByText("Gjærbakst")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Skoleboller/ })).toBeInTheDocument();

    // mottakeren legger hele boken på hylla
    const mottaker = await makeKokebok();
    hoisted.userId = mottaker.user.id;
    const feil = await leggDeltBokPåHylla(share.id, new FormData()).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:\/kokebok\//);

    const mine = await db.select().from(cookbook).where(eq(cookbook.userId, mottaker.user.id));
    const kopi = mine.find((rad) => rad.name === "Testkokeboka" && rad.id !== mottaker.bok.id);
    expect(kopi).toBeDefined();
    expect(kopi!.synlighet).toBe("privat");

    const kopierteKapitler = await db.select().from(chapters).where(eq(chapters.cookbookId, kopi!.id));
    expect(kopierteKapitler.map((rad) => rad.name)).toEqual(["Gjærbakst"]);

    const kopierteOppskrifter = await db.select().from(recipes).where(eq(recipes.cookbookId, kopi!.id));
    expect(kopierteOppskrifter.map((rad) => rad.title).sort()).toEqual(["Skoleboller", "Vaniljekrem"]);

    // kapittel-koblingen og se-også-lenken er oversatt til de nye idene
    const nyBolle = kopierteOppskrifter.find((rad) => rad.title === "Skoleboller")!;
    const nyKrem  = kopierteOppskrifter.find((rad) => rad.title === "Vaniljekrem")!;
    expect(await db.select().from(recipeChapters).where(eq(recipeChapters.recipeId, nyBolle.id))).toHaveLength(1);

    const nyeLenker = await db.select().from(recipeLinks).where(eq(recipeLinks.fromRecipeId, nyBolle.id));
    expect(nyeLenker).toHaveLength(1);
    expect(nyeLenker[0].toRecipeId).toBe(nyKrem.id);
  });

  it("ukjent token gir 404", async () => {
    await expect(DeltSide({
      params: Promise.resolve({ token: encodeUuidToBase32("00000000-0000-4000-8000-000000000000") }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
