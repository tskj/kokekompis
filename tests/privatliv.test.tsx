// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cookbook } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb } from "./db";
import "./rtl";
import { cleanup, render, screen } from "./rtl";

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

import Home from "@/app/page";
import CookbookLayout from "@/app/kokebok/[id]/layout";
import RecipePage from "@/app/kokebok/[id]/@recipe/oppskrift/[recipeid]/page";
import BakPage from "@/app/bak/[recipeid]/page";
import { settBokSynlighet } from "@/app/actions/bok";

function layoutProps(bokId: string) {
  return { recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bokId) }) };
}

function sideProps(bokId: string, oppskriftId: string) {
  return {
    params: Promise.resolve({ id: encodeUuidToBase32(bokId), recipeid: encodeUuidToBase32(oppskriftId) }),
    searchParams: Promise.resolve({}),
  };
}

function bakProps(oppskriftId: string) {
  return {
    params: Promise.resolve({ recipeid: encodeUuidToBase32(oppskriftId) }),
    searchParams: Promise.resolve({}),
  };
}

describe("privatliv: bøker er private, utstilte bøker kan alle lese", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("forsiden viser bare dine egne bøker når du er logget inn", async () => {
    const { user, bok } = await makeKokebok();
    const annen = await makeKokebok({ synlighet: "utstilt" });
    await db.update(cookbook).set({ name: "Annens utstilte bok" }).where(eq(cookbook.id, annen.bok.id));
    hoisted.userId = user.id;

    render(await Home());

    expect(screen.getByText(bok.name)).toBeInTheDocument();
    expect(screen.queryByText("Annens utstilte bok")).not.toBeInTheDocument();
  });

  it("forsiden viser utvalget av utstilte bøker for en utlogget gjest", async () => {
    await makeKokebok();
    const utstilt = await makeKokebok({ synlighet: "utstilt" });
    await db.update(cookbook).set({ name: "Marens utstilte bok" }).where(eq(cookbook.id, utstilt.bok.id));

    render(await Home());

    expect(screen.getByText("Marens utstilte bok")).toBeInTheDocument();
    expect(screen.getByText(/Et lite utvalg fra hylla/)).toBeInTheDocument();
    // den private boken heter "Testkokeboka" — og den skal ingen gjest se
    expect(screen.queryByText("Testkokeboka")).not.toBeInTheDocument();
    expect(screen.queryByText("ny bok")).not.toBeInTheDocument();
  });

  it("en privat bok finnes ikke for andre — eieren kommer rett inn", async () => {
    const { user, bok } = await makeKokebok();
    const fremmed = await makeKokebok();

    hoisted.userId = fremmed.user.id;
    await expect(CookbookLayout(layoutProps(bok.id))).rejects.toThrow("NEXT_NOT_FOUND");

    hoisted.userId = "";
    await expect(CookbookLayout(layoutProps(bok.id))).rejects.toThrow("NEXT_NOT_FOUND");

    hoisted.userId = user.id;
    render(await CookbookLayout(layoutProps(bok.id)));
    expect(screen.getByRole("heading", { name: bok.name })).toBeInTheDocument();
  });

  it("en utstilt bok kan leses av gjester — men uten eierens stelleknapper", async () => {
    const { user, bok } = await makeKokebok({ synlighet: "utstilt" });

    hoisted.userId = "";
    render(await CookbookLayout(layoutProps(bok.id)));
    expect(screen.getByRole("heading", { name: bok.name })).toBeInTheDocument();
    expect(screen.getByText("Gjærbakst")).toBeInTheDocument();
    expect(screen.queryByText("+ nytt kapittel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Endre navn på boken")).not.toBeInTheDocument();
    expect(screen.queryByText(/Ny oppskrift/)).not.toBeInTheDocument();

    // eieren har dem alle
    cleanup();
    hoisted.userId = user.id;
    render(await CookbookLayout(layoutProps(bok.id)));
    expect(screen.getByText("+ nytt kapittel")).toBeInTheDocument();
    expect(screen.getByLabelText("Endre navn på boken")).toBeInTheDocument();
  });

  it("utstilling er forbeholdt admin — vanlige eiere og fremmede preller av", async () => {
    const { user: admin, bok } = await makeKokebok({ admin: true });
    const vanlig = await makeKokebok();

    const skjema = new FormData();
    skjema.set("synlighet", "utstilt");

    // en vanlig eier får ikke stilt ut sin egen bok
    hoisted.userId = vanlig.user.id;
    await settBokSynlighet(vanlig.bok.id, skjema);
    let rad = await db.select().from(cookbook).where(eq(cookbook.id, vanlig.bok.id)).single("test.vanlig");
    expect(rad.synlighet).toBe("privat");

    // en admin får heller ikke stilt ut andres bøker
    hoisted.userId = admin.id;
    await settBokSynlighet(vanlig.bok.id, skjema);
    rad = await db.select().from(cookbook).where(eq(cookbook.id, vanlig.bok.id)).single("test.fremmed");
    expect(rad.synlighet).toBe("privat");

    // admin stiller ut sin egen
    await settBokSynlighet(bok.id, skjema);
    rad = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.admin");
    expect(rad.synlighet).toBe("utstilt");
  });

  it("oppskrift i privat bok 404-er for fremmede; i utstilt bok leses den uten redigeringsknapper", async () => {
    const privat = await makeKokebok();
    const utstilt = await makeKokebok({ synlighet: "utstilt" });
    const fremmed = await makeKokebok();
    hoisted.userId = fremmed.user.id;

    await expect(RecipePage(sideProps(privat.bok.id, privat.oppskrift.id))).rejects.toThrow("NEXT_NOT_FOUND");

    render(await RecipePage(sideProps(utstilt.bok.id, utstilt.oppskrift.id)));
    expect(screen.getByRole("heading", { name: "Testboller" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Rediger" })).not.toBeInTheDocument();
    expect(screen.queryByText("Del oppskriften")).not.toBeInTheDocument();
    expect(screen.queryByText("Flytt …")).not.toBeInTheDocument();
    // gjesten er innlogget: lappene og hjertet er personlige og fortsatt der
    expect(screen.getByText("ny lapp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Merk som favoritt" })).toBeInTheDocument();
  });

  it("en utlogget gjest leser den utstilte oppskriften uten lapper og hjerte", async () => {
    const utstilt = await makeKokebok({ synlighet: "utstilt" });

    render(await RecipePage(sideProps(utstilt.bok.id, utstilt.oppskrift.id)));
    expect(screen.getByRole("heading", { name: "Testboller" })).toBeInTheDocument();
    expect(screen.queryByText("ny lapp")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Merk som favoritt" })).not.toBeInTheDocument();
  });

  it("bakeviewet følger bokens synlighet", async () => {
    const privat = await makeKokebok();
    const utstilt = await makeKokebok({ synlighet: "utstilt" });

    await expect(BakPage(bakProps(privat.oppskrift.id))).rejects.toThrow("NEXT_NOT_FOUND");

    render(await BakPage(bakProps(utstilt.oppskrift.id)));
    expect(screen.getByText("Elt sammen mel og sukker.")).toBeInTheDocument();
  });
});
