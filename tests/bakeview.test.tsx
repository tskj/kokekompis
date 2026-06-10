// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
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

import BakPage from "@/app/bak/[recipeid]/page";

// testOppskrift har tre steg: elt (aktivt, hvetemel+sukker) → heving (passivt, 60 min) → fyll (imens, kanel)
function bakProps(recipeId: string, søk: Record<string, string> = {}) {
  return {
    params: Promise.resolve({ recipeid: encodeUuidToBase32(recipeId) }),
    searchParams: Promise.resolve(søk),
  };
}

describe("bakeviewet (ekte side mot ekte database)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("fletter stegets ingredienser med mengder inn i stegkortet", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await BakPage(bakProps(oppskrift.id, { steg: "1" })));

    expect(screen.getByText("Elt sammen mel og sukker.")).toBeInTheDocument();
    expect(screen.getByText("9 dl")).toBeInTheDocument();
    expect(screen.getByText(/hvetemel/)).toBeInTheDocument();
    expect(screen.getByText("1 dl")).toBeInTheDocument();

    // ingen redigering i bakeviewet — kun fremover/bakover
    expect(screen.queryByText(/Rediger/)).not.toBeInTheDocument();
  });

  it("viser ventesteg som eget stort kort med tid", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await BakPage(bakProps(oppskrift.id, { steg: "2" })));

    expect(screen.getByText("heving")).toBeInTheDocument();
    expect(screen.getByText(/ca\. 1 t/)).toBeInTheDocument();
    // og hinter om at neste steg kan gjøres imens
    expect(screen.getByText(/Du kan fortsette imens/)).toBeInTheDocument();
  });

  it("viser pågående venting som imens-kort ved siden av imens-steget", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await BakPage(bakProps(oppskrift.id, { steg: "3" })));

    expect(screen.getByText("Strø over kanel.")).toBeInTheDocument();
    expect(screen.getByText("Imens, i bakgrunnen")).toBeInTheDocument();
    expect(screen.getByText(/◷ heving/)).toBeInTheDocument();
  });

  it("lineær modus skjuler imens-kortet — noobs vil ha ett og ett steg", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await BakPage(bakProps(oppskrift.id, { steg: "3", modus: "linear" })));

    expect(screen.getByText("Strø over kanel.")).toBeInTheDocument();
    expect(screen.queryByText("Imens, i bakgrunnen")).not.toBeInTheDocument();
  });

  it("klamper stegnummeret og viser lappene", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await BakPage(bakProps(oppskrift.id, { steg: "99" })));

    // siste steg + Ferdig-knapp i stedet for Neste
    expect(screen.getByText("Strø over kanel.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ferdig ✓" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ny lapp")).toBeInTheDocument();
  });
});
