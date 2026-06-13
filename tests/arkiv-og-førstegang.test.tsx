// @vitest-environment jsdom
import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cookbook, recipes, users } from "@/lib/db/schema";
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

import { arkiverBok, gjenåpneBok, slettBok } from "@/app/actions/bok";
import Home from "@/app/page";
import CookbookLayout from "@/app/kokebok/[id]/layout";
import OppslagSide from "@/app/oppslag/page";
import FavoritterSide from "@/app/favoritter/page";

async function ferskBruker() {
  return db
    .insert(users)
    .values({ id: randomUUID(), name: "Fersk Bruker", email: `${randomUUID()}@example.test` })
    .returning()
    .single("test.fersk-bruker");
}

describe("arkivet og førstegangsopplevelsen", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("arkivering tar boken av hylla — den ligger i arkivet og kan settes tilbake", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    const feil = await arkiverBok(bok.id, new FormData()).then(() => null, (e: Error) => e);
    expect(feil?.message).toBe("NEXT_REDIRECT:/");

    render(await Home());
    expect(screen.queryByRole("link", { name: /Testkokeboka/ })).not.toBeInTheDocument();
    expect(screen.getByText("Arkivet (1)")).toBeInTheDocument();
    cleanup();

    await gjenåpneBok(bok.id, new FormData());

    const rad = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.gjenåpnet");
    expect(rad.arkivert).toBeNull();
  });

  it("fremmede verken arkiverer eller sletter boken din", async () => {
    const { bok } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = annen.user.id;

    await arkiverBok(bok.id, new FormData());
    await slettBok(bok.id, new FormData());

    const rad = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.urørt");
    expect(rad.arkivert).toBeNull();
  });

  it("sletting for godt tar med seg boken og alle oppskriftene", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    const feil = await slettBok(bok.id, new FormData()).then(() => null, (e: Error) => e);
    expect(feil?.message).toBe("NEXT_REDIRECT:/");

    expect(await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).exists()).toBe(false);
    expect(await db.select().from(recipes).where(eq(recipes.id, oppskrift.id)).exists()).toBe(false);
  });

  it("en arkivert bok forteller eieren hvor den står — med veien tilbake til hylla", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    await arkiverBok(bok.id, new FormData()).catch(() => {});

    render(await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bok.id) }) }));
    expect(screen.getByText("Denne boken ligger i arkivet — den står ikke på hylla.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sett den tilbake på hylla" })).toBeInTheDocument();
  });

  it("første besøk: «Min første kokebok» står klar — og bare den ene gangen", async () => {
    const bruker = await ferskBruker();
    hoisted.userId = bruker.id;

    render(await Home());
    expect(screen.getByRole("link", { name: /Min første kokebok/ })).toBeInTheDocument();
    cleanup();

    render(await Home());
    const bøker = await db.select().from(cookbook).where(eq(cookbook.userId, bruker.id));
    expect(bøker).toHaveLength(1);
  });

  it("Favoritter og Oppslagsboka står alltid på hylla for innloggede — også med tom favorittbok", async () => {
    const bruker = await ferskBruker();
    hoisted.userId = bruker.id;

    render(await Home());
    expect(screen.getByText("♥ Favoritter")).toBeInTheDocument();
    expect(screen.getByText("Oppslagsboka")).toBeInTheDocument();
  });

  it("Oppslagsboka er illustrert: en tegning ved hvert innebygde oppslag, og kompisen på toppen", async () => {
    const { container } = render(await OppslagSide());

    expect(container.querySelectorAll("summary svg")).toHaveLength(7);
    expect(screen.getByTestId("kompis")).toBeInTheDocument();
  });

  it("favorittboken leser som en vanlig bok: oppskriftene under kapitlene sine", async () => {
    const { user, oppskrift, kapittel } = await makeKokebok();
    hoisted.userId = user.id;

    const { toggleFavoritt } = await import("@/app/actions/favoritter");
    await toggleFavoritt(oppskrift.id, new FormData());

    render(await FavoritterSide());
    expect(screen.getByText(kapittel.name)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Testboller/ })).toBeInTheDocument();
  });
});
