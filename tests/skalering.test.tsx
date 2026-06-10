// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb, testOppskrift } from "./db";
import "./rtl";
import { render, screen } from "./rtl";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

import RecipePage from "@/app/kokebok/[id]/@recipe/oppskrift/[recipeid]/page";
import BakPage from "@/app/bak/[recipeid]/page";

function sideProps(bokId: string, oppskriftId: string, søk: Record<string, string> = {}) {
  return {
    params: Promise.resolve({ id: encodeUuidToBase32(bokId), recipeid: encodeUuidToBase32(oppskriftId) }),
    searchParams: Promise.resolve(søk),
  };
}

// testOppskrift: 9 dl hvetemel, 1 dl sukker, 2 ss kanel — 12 boller
describe("porsjonsmultiplikatoren (?ganger=N)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("firedobler mengdene og porsjonene", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id, { ganger: "4" })));

    expect(screen.getByText("36 dl")).toBeInTheDocument();
    expect(screen.getByText("8 ss")).toBeInTheDocument();
    expect(screen.getByText("48 boller (4×)")).toBeInTheDocument();
    // 4× er markert som aktivt valg
    expect(screen.getByRole("link", { name: "4×" })).toHaveAttribute("aria-current", "true");
  });

  it("halverer med ½× og skriver kokebok-brøk", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id, { ganger: "0.5" })));

    expect(screen.getByText("4 ½ dl")).toBeInTheDocument();
    expect(screen.getByText("½ dl")).toBeInTheDocument();
    expect(screen.getByText("6 boller (½×)")).toBeInTheDocument();
  });

  it("skalerer også gramvisningen — originalen i parentes er uskalert", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id, { ganger: "2", enheter: "gram" })));

    // 9 dl hvetemel × 2 à 60 g/dl = 1080 g
    expect(screen.getByText("1080 g")).toBeInTheDocument();
    expect(screen.getByText("(9 dl i originalen)")).toBeInTheDocument();
  });

  it("avviser tull i parameteren", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id, { ganger: "17" })));

    expect(screen.getByText("9 dl")).toBeInTheDocument();
    expect(screen.queryByText("36 dl")).not.toBeInTheDocument();
  });

  it("kanSkaleres: false skjuler valgene og ignorerer parameteren — langpannen bestemmer", async () => {
    const innhold = testOppskrift();
    innhold.info.kanSkaleres = false;
    const { user, bok, oppskrift } = await makeKokebok({ content: innhold });
    hoisted.userId = user.id;

    render(await RecipePage(sideProps(bok.id, oppskrift.id, { ganger: "4" })));

    expect(screen.getByText("9 dl")).toBeInTheDocument();
    expect(screen.queryByLabelText("Porsjonsmultiplikator")).not.toBeInTheDocument();
    expect(screen.getByText("12 boller")).toBeInTheDocument();
  });

  it("følger med inn i bakeviewet — mengdekortene skalerer og badgen viser det", async () => {
    const { user, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;

    render(await BakPage({
      params: Promise.resolve({ recipeid: encodeUuidToBase32(oppskrift.id) }),
      searchParams: Promise.resolve({ steg: "1", ganger: "4" }),
    }));

    expect(screen.getByText("36 dl")).toBeInTheDocument();
    expect(screen.getByText("4×")).toBeInTheDocument();

    // og navigasjonen mister den ikke
    const neste = screen.getByRole("link", { name: "Neste →" });
    expect(neste.getAttribute("href")).toContain("ganger=4");
  });
});
