// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipeShares } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb } from "./db";
import "./rtl";
import { render, screen } from "./rtl";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

import { delOppskrift } from "@/app/actions/deling";
import DeltSide from "@/app/delt/[token]/page";

async function delOgFåToken(recipeId: string): Promise<string> {
  const feil = await delOppskrift(recipeId).then(() => null, (e: Error) => e);

  expect(feil?.message).toMatch(/^NEXT_REDIRECT:\/delt\//);
  return feil!.message.replace("NEXT_REDIRECT:/delt/", "");
}

describe("deling (ekte actions, ekte database, ekte delingsside)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("å dele lager én lenke — og å dele igjen gir samme lenke", async () => {
    const { oppskrift } = await makeKokebok();

    const token1 = await delOgFåToken(oppskrift.id);
    const token2 = await delOgFåToken(oppskrift.id);
    expect(token1).toBe(token2);

    const rader = await db.select().from(recipeShares).where(eq(recipeShares.recipeId, oppskrift.id));
    expect(rader).toHaveLength(1);
    expect(encodeUuidToBase32(rader[0].id)).toBe(token1);
  });

  it("delingssiden viser oppskriften med opprinnelsen — den følger alltid med", async () => {
    const { oppskrift } = await makeKokebok({ title: "Mormors skillingsboller" });
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
    const { oppskrift } = await makeKokebok();
    const token = await delOgFåToken(oppskrift.id);

    render(await DeltSide({
      params: Promise.resolve({ token }),
      searchParams: Promise.resolve({ enheter: "gram" }),
    }));

    // 9 dl hvetemel à 60 g/dl
    expect(screen.getByText("540 g")).toBeInTheDocument();
    expect(screen.getByText("(9 dl)")).toBeInTheDocument();
  });

  it("ukjent token gir 404", async () => {
    await expect(DeltSide({
      params: Promise.resolve({ token: encodeUuidToBase32("00000000-0000-4000-8000-000000000000") }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
