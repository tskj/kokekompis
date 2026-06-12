// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, planRecipes, recipes } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb, testOppskrift } from "./db";
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
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

import { opprettPlan, slettPlan, leggTilIPlan, fjernFraPlan } from "@/app/actions/planer";
import PlanSide from "@/app/planer/[id]/page";
import RecipePage from "@/app/kokebok/[id]/@recipe/oppskrift/[recipeid]/page";
import Home from "@/app/page";

function planSkjema(navn: string, dato?: string): FormData {
  const formData = new FormData();
  formData.set("navn", navn);
  if (dato) formData.set("dato", dato);

  return formData;
}

function leggTilSkjema(planId: string): FormData {
  const formData = new FormData();
  formData.set("plan", encodeUuidToBase32(planId));

  return formData;
}

async function lagPlan(userId: string, navn = "17. mai-frokost", dato?: string) {
  return db
    .insert(plans)
    .values({ userId, name: navn, dato: dato ?? null })
    .returning()
    .single("test.plan");
}

function sideProps(planId: string) {
  return { params: Promise.resolve({ id: encodeUuidToBase32(planId) }) };
}

describe("planer (ekte actions, ekte database, ekte planside)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("legger en plan med dato og sendes rett inn i den", async () => {
    const { user } = await makeKokebok();
    hoisted.userId = user.id;

    const feil = await opprettPlan(planSkjema("17. mai-frokost", "2027-05-17")).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:\/planer\//);

    const rader = await db.select().from(plans).where(eq(plans.userId, user.id));
    expect(rader).toHaveLength(1);
    expect(rader[0].name).toBe("17. mai-frokost");
    expect(rader[0].dato).toBe("2027-05-17");
  });

  it("samler oppskrifter bakerst i planen — og samme oppskrift to ganger er én", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const krem = await db
      .insert(recipes)
      .values({ userId: user.id, cookbookId: bok.id, title: "Vaniljekrem", description: null, content: testOppskrift() })
      .returning()
      .single("test.krem");

    const plan = await lagPlan(user.id);
    await leggTilIPlan(oppskrift.id, leggTilSkjema(plan.id));
    await leggTilIPlan(krem.id, leggTilSkjema(plan.id));
    await leggTilIPlan(oppskrift.id, leggTilSkjema(plan.id));

    const rader = await db
      .select({ recipeId: planRecipes.recipeId, order: planRecipes.order })
      .from(planRecipes)
      .where(eq(planRecipes.planId, plan.id))
      .orderBy(asc(planRecipes.order));
    expect(rader.map((rad) => [rad.recipeId, rad.order])).toEqual([[oppskrift.id, 1], [krem.id, 2]]);
  });

  it("slipper aldri noe inn i andres planer — og aldri andres private oppskrifter inn i dine", async () => {
    const { user, oppskrift } = await makeKokebok();
    const annen = await makeKokebok();

    // fremmed prøver å fylle planen min
    const minPlan = await lagPlan(user.id);
    hoisted.userId = annen.user.id;
    await leggTilIPlan(annen.oppskrift.id, leggTilSkjema(minPlan.id));

    // jeg prøver å legge en annens private oppskrift i min plan
    hoisted.userId = user.id;
    await leggTilIPlan(annen.oppskrift.id, leggTilSkjema(minPlan.id));

    expect(await db.select().from(planRecipes).where(eq(planRecipes.planId, minPlan.id))).toHaveLength(0);

    // en utstilt bok kan derimot planlegges fra
    const utstilt = await makeKokebok({ synlighet: "utstilt" });
    await leggTilIPlan(utstilt.oppskrift.id, leggTilSkjema(minPlan.id));
    expect(await db.select().from(planRecipes).where(eq(planRecipes.planId, minPlan.id))).toHaveLength(1);

    void oppskrift;
  });

  it("tar en oppskrift ut av planen — men fremmede får ikke rive i den", async () => {
    const { user, oppskrift } = await makeKokebok();
    const annen = await makeKokebok();

    const plan = await lagPlan(user.id);
    hoisted.userId = user.id;
    await leggTilIPlan(oppskrift.id, leggTilSkjema(plan.id));

    hoisted.userId = annen.user.id;
    await fjernFraPlan(plan.id, oppskrift.id, new FormData());
    expect(await db.select().from(planRecipes).where(eq(planRecipes.planId, plan.id))).toHaveLength(1);

    hoisted.userId = user.id;
    await fjernFraPlan(plan.id, oppskrift.id, new FormData());
    expect(await db.select().from(planRecipes).where(eq(planRecipes.planId, plan.id))).toHaveLength(0);
  });

  it("plansiden viser oppskriftene og handlelisten summert på tvers", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const krem = await db
      .insert(recipes)
      .values({ userId: user.id, cookbookId: bok.id, title: "Vaniljekrem", description: null, content: testOppskrift() })
      .returning()
      .single("test.krem");

    const plan = await lagPlan(user.id, "Julebakst", "2026-12-24");
    await leggTilIPlan(oppskrift.id, leggTilSkjema(plan.id));
    await leggTilIPlan(krem.id, leggTilSkjema(plan.id));

    render(await PlanSide(sideProps(plan.id)));

    expect(screen.getByRole("heading", { name: "Julebakst" })).toBeInTheDocument();
    expect(screen.getByText("24. desember 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Testboller" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vaniljekrem" })).toBeInTheDocument();

    // to testoppskrifter à 9 dl hvetemel og 2 ss kanel → én linje av hver, summert
    expect(screen.getByText("18 dl")).toBeInTheDocument();
    expect(screen.getByText("4 ss")).toBeInTheDocument();
  });

  it("oppskriftssiden viser hvilke planer den ligger i — og tilbyr bare resten", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const frokost = await lagPlan(user.id, "17. mai-frokost");
    await leggTilIPlan(oppskrift.id, leggTilSkjema(frokost.id));

    // én plan, og oppskriften ligger i den: merket vises, "Til plan …" har ingenting å tilby
    render(await RecipePage({
      params: Promise.resolve({ id: encodeUuidToBase32(bok.id), recipeid: encodeUuidToBase32(oppskrift.id) }),
      searchParams: Promise.resolve({}),
    }));
    expect(screen.getByText("På planen: 17. mai-frokost")).toBeInTheDocument();
    expect(screen.queryByText("Til plan …")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ta oppskriften ut av 17. mai-frokost" })).toBeInTheDocument();
  });

  it("forsiden legger planene som lapper på skrivebordet", async () => {
    const { user } = await makeKokebok();
    hoisted.userId = user.id;

    await lagPlan(user.id, "Julebakst", "2026-12-24");

    render(await Home());
    expect(screen.getByText("Julebakst")).toBeInTheDocument();
    expect(screen.getByText("24. desember 2026")).toBeInTheDocument();
    expect(screen.getByText("planlegg noe")).toBeInTheDocument();
  });

  it("plansiden er din egen — fremmede og utloggede får 404", async () => {
    const { user } = await makeKokebok();
    const annen = await makeKokebok();
    const plan = await lagPlan(user.id);

    hoisted.userId = annen.user.id;
    await expect(PlanSide(sideProps(plan.id))).rejects.toThrow("NEXT_NOT_FOUND");

    hoisted.userId = "";
    await expect(PlanSide(sideProps(plan.id))).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("river ut planen — oppskriftene den pekte på består", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const plan = await lagPlan(user.id);
    await leggTilIPlan(oppskrift.id, leggTilSkjema(plan.id));

    const feil = await slettPlan(plan.id, new FormData()).then(() => null, (e: Error) => e);
    expect(feil?.message).toBe("NEXT_REDIRECT:/planer");

    expect(await db.select().from(plans).where(eq(plans.id, plan.id))).toHaveLength(0);
    expect(await db.select().from(recipes).where(eq(recipes.id, oppskrift.id))).toHaveLength(1);
  });
});
