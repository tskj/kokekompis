// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, recipes, recipeMarginalia, recipeContentSchema } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb } from "./db";
import "./rtl";
import { render, screen } from "./rtl";

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
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn(), prefetch: vi.fn(), back: vi.fn() })),
}));

import { settSkrift } from "@/app/actions/skrift";
import { opprettTomOppskrift } from "@/app/actions/rediger";
import { skrivIMargen, slettMarginal, flyttMarginal } from "@/app/actions/marginalia";
import RecipePage from "@/app/kokebok/[id]/@recipe/oppskrift/[recipeid]/page";
import InnstillingerSide from "@/app/innstillinger/page";

function sideProps(bokId: string, oppskriftId: string) {
  return {
    params: Promise.resolve({ id: encodeUuidToBase32(bokId), recipeid: encodeUuidToBase32(oppskriftId) }),
    searchParams: Promise.resolve({}),
  };
}

describe("skriftvalg, skriv-selv-oppskrift og margskrift", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("skriftvalgene huskes på brukeren — og tull faller til montserrat (standarden)", async () => {
    const { user } = await makeKokebok();
    hoisted.userId = user.id;

    const skjema = new FormData();
    skjema.set("tekst", "times");
    skjema.set("oppskrift", "petit");
    await settSkrift(skjema);

    let rad = await db.select().from(users).where(eq(users.id, user.id)).single("test.skrift");
    expect(rad.tekstFont).toBe("times");
    expect(rad.oppskriftFont).toBe("petit");

    skjema.set("tekst", "comic-sans");
    skjema.set("oppskrift", "wingdings");
    await settSkrift(skjema);

    rad = await db.select().from(users).where(eq(users.id, user.id)).single("test.tull");
    expect(rad.tekstFont).toBe("montserrat");
    expect(rad.oppskriftFont).toBe("montserrat");
  });

  it("margskriften kan plasseres fritt på flaten — bare av sin eier, og bare innenfor", async () => {
    const { user, oppskrift } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    // en ren krussedull uten tekst er lov — ringen rundt et ord sier sitt selv
    const skjema = new FormData();
    skjema.set("krussedull", "ring");
    await skrivIMargen(oppskrift.id, skjema);

    const marginal = await db.select().from(recipeMarginalia).where(eq(recipeMarginalia.recipeId, oppskrift.id)).single("test.ring");
    expect(marginal.tekst).toBeNull();
    expect(marginal.posX).toBeNull();

    await flyttMarginal(marginal.id, 0.42, 0.6);
    let flyttet = await db.select().from(recipeMarginalia).where(eq(recipeMarginalia.id, marginal.id)).single("test.plassert");
    expect(flyttet.posX).toBeCloseTo(0.42);
    expect(flyttet.posY).toBeCloseTo(0.6);

    // utenfor flaten og fremmede preller av
    await flyttMarginal(marginal.id, 7, -1);
    hoisted.userId = annen.user.id;
    await flyttMarginal(marginal.id, 0.1, 0.1);

    flyttet = await db.select().from(recipeMarginalia).where(eq(recipeMarginalia.id, marginal.id)).single("test.urørt");
    expect(flyttet.posX).toBeCloseTo(0.42);

    // og helt tomt blir ingenting
    hoisted.userId = user.id;
    await skrivIMargen(oppskrift.id, new FormData());
    expect(await db.select().from(recipeMarginalia).where(eq(recipeMarginalia.recipeId, oppskrift.id))).toHaveLength(1);
  });

  it("innstillingene viser hvem som er logget inn, veien ut, og skriftvalgene", async () => {
    const { user } = await makeKokebok();
    hoisted.userId = user.id;

    render(await InnstillingerSide());

    expect(screen.getByText(user.name!)).toBeInTheDocument();
    expect(screen.getByText(user.email)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logg ut" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Brødtekst på siden" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Skrift i oppskriftene" })).toBeInTheDocument();
  });

  it("«skriv den selv» lager en blank oppskrift og sender deg rett i redigeringen", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    const feil = await opprettTomOppskrift(bok.id, new FormData()).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:.*\/rediger$/);

    const nye = await db.select().from(recipes).where(eq(recipes.title, "Ny oppskrift"));
    expect(nye).toHaveLength(1);
    expect(nye[0].cookbookId).toBe(bok.id);

    const content = recipeContentSchema.parse(nye[0].content);
    expect(content.ingredienser).toHaveLength(0);
    expect(content.steg).toHaveLength(0);
  });

  it("fremmede skriver ikke i din bok", async () => {
    const { bok } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = annen.user.id;

    await opprettTomOppskrift(bok.id, new FormData());

    expect(await db.select().from(recipes).where(eq(recipes.cookbookId, bok.id))).toHaveLength(1);
  });

  it("margskriften: skriver med krussedull, vises i margen, og bare din egen kan viskes ut", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = user.id;

    const skjema = new FormData();
    skjema.set("tekst", "MÅ heve over natten!");
    skjema.set("krussedull", "utrop");
    await skrivIMargen(oppskrift.id, skjema);

    const marginal = await db.select().from(recipeMarginalia).where(eq(recipeMarginalia.recipeId, oppskrift.id)).single("test.marg");
    expect(marginal.krussedull).toBe("utrop");
    expect(marginal.userId).toBe(user.id);

    // margen og mobilkopien — samme skrift to steder, CSS viser én
    render(await RecipePage(sideProps(bok.id, oppskrift.id)));
    expect(screen.getAllByText("MÅ heve over natten!")).toHaveLength(2);

    hoisted.userId = annen.user.id;
    await slettMarginal(marginal.id, new FormData());
    expect(await db.select().from(recipeMarginalia).where(eq(recipeMarginalia.id, marginal.id))).toHaveLength(1);

    hoisted.userId = user.id;
    await slettMarginal(marginal.id, new FormData());
    expect(await db.select().from(recipeMarginalia).where(eq(recipeMarginalia.id, marginal.id))).toHaveLength(0);
  });

  it("margskrift på andres private oppskrifter preller av — og tullete krusseduller lagres uten", async () => {
    const { user, oppskrift } = await makeKokebok();
    const annen = await makeKokebok();

    hoisted.userId = annen.user.id;
    const skjema = new FormData();
    skjema.set("tekst", "snik i margen");
    await skrivIMargen(oppskrift.id, skjema);
    expect(await db.select().from(recipeMarginalia).where(eq(recipeMarginalia.recipeId, oppskrift.id))).toHaveLength(0);

    hoisted.userId = user.id;
    skjema.set("tekst", "husk smør");
    skjema.set("krussedull", "hjerteborder");
    await skrivIMargen(oppskrift.id, skjema);

    const marginal = await db.select().from(recipeMarginalia).where(eq(recipeMarginalia.recipeId, oppskrift.id)).single("test.uten");
    expect(marginal.krussedull).toBeNull();
  });
});
