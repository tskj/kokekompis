// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cookbook } from "@/lib/db/schema";
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

import Home from "@/app/page";
import CookbookLayout from "@/app/kokebok/[id]/layout";
import RecipePage from "@/app/kokebok/[id]/@recipe/oppskrift/[recipeid]/page";
import BakPage from "@/app/bak/[recipeid]/page";

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

// En bok er ALLTID privat — bare eieren ser den, uansett hva synlighet-kolonnen måtte si
// (den står igjen fra utstillings-tiden). Innsyn for andre går kun via delingslenkene,
// som testes i deling.test.tsx.
describe("privatliv: bøker er private — deling går via delingslenker", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("forsiden viser bare dine egne bøker når du er logget inn", async () => {
    const { user, bok } = await makeKokebok();
    const annen = await makeKokebok({ synlighet: "utstilt" });
    await db.update(cookbook).set({ name: "Annens bok" }).where(eq(cookbook.id, annen.bok.id));
    hoisted.userId = user.id;

    render(await Home());

    expect(screen.getByText(bok.name)).toBeInTheDocument();
    expect(screen.queryByText("Annens bok")).not.toBeInTheDocument();
  });

  it("en utlogget gjest har ingen hylle — bare Oppslagsboka og en invitasjon", async () => {
    await makeKokebok();
    const merket = await makeKokebok({ synlighet: "utstilt" });
    await db.update(cookbook).set({ name: "Marens bok" }).where(eq(cookbook.id, merket.bok.id));

    render(await Home());

    // ingen bøker vises for gjester — heller ikke rader merket utstilt i gamle data
    expect(screen.queryByText("Marens bok")).not.toBeInTheDocument();
    expect(screen.queryByText("Testkokeboka")).not.toBeInTheDocument();
    expect(screen.queryByText("ny bok")).not.toBeInTheDocument();

    // men oppslagsverket står fremme, og en invitasjon til å logge inn
    expect(screen.getByText("Oppslagsboka")).toBeInTheDocument();
    expect(screen.getByText(/Logg inn for å sette den første boken/)).toBeInTheDocument();
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
    expect(screen.getByText("+ nytt kapittel")).toBeInTheDocument();
    expect(screen.getByLabelText("Endre navn på boken")).toBeInTheDocument();
  });

  it("gamle utstilt-merker gir IKKE lenger innsyn — verken bok, oppskrift eller bakeview", async () => {
    const utstilt = await makeKokebok({ synlighet: "utstilt" });
    const fremmed = await makeKokebok();

    // utlogget gjest
    hoisted.userId = "";
    await expect(CookbookLayout(layoutProps(utstilt.bok.id))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(RecipePage(sideProps(utstilt.bok.id, utstilt.oppskrift.id))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(BakPage(bakProps(utstilt.oppskrift.id))).rejects.toThrow("NEXT_NOT_FOUND");

    // innlogget fremmed
    hoisted.userId = fremmed.user.id;
    await expect(CookbookLayout(layoutProps(utstilt.bok.id))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(RecipePage(sideProps(utstilt.bok.id, utstilt.oppskrift.id))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(BakPage(bakProps(utstilt.oppskrift.id))).rejects.toThrow("NEXT_NOT_FOUND");

    // eieren leser som før
    hoisted.userId = utstilt.user.id;
    render(await RecipePage(sideProps(utstilt.bok.id, utstilt.oppskrift.id)));
    expect(screen.getByRole("heading", { name: "Testboller" })).toBeInTheDocument();
  });

  it("bok-headeren sier at boken er privat — og tilbyr deling", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    render(await CookbookLayout(layoutProps(bok.id)));
    expect(screen.getByText(/Privat bok — bare du ser den/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Del hele boken med en venn" })).toBeInTheDocument();
  });
});
