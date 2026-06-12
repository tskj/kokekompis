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
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect:  vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound:  vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  useParams: vi.fn(() => ({})),
}));

import { settBokForside } from "@/app/actions/bok";
import DefaultRecipe from "@/app/kokebok/[id]/@recipe/default";
import CookbookLayout from "@/app/kokebok/[id]/layout";

function forsideProps(bokId: string) {
  return { params: Promise.resolve({ id: encodeUuidToBase32(bokId) }) };
}

describe("bokens forside og lukkede kapitler", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
  });

  it("eieren velger skisse og noen ord — og forsiden viser dem", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    const skjema = new FormData();
    skjema.set("beskrivelse", "Alt mormor aldri målte opp.");
    skjema.set("skisse", "bolle");
    await settBokForside(bok.id, skjema);

    const rad = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.forside");
    expect(rad.beskrivelse).toBe("Alt mormor aldri målte opp.");
    expect(rad.skisse).toBe("bolle");

    const { container } = render(await DefaultRecipe(forsideProps(bok.id)));
    expect(screen.getByText("Alt mormor aldri målte opp.")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.queryByText("Slå opp i boken")).not.toBeInTheDocument();
  });

  it("uten forside står oppslagshintet — og tullete skisser lagres ikke", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    const skjema = new FormData();
    skjema.set("skisse", "traktor");
    await settBokForside(bok.id, skjema);

    const rad = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.tull");
    expect(rad.skisse).toBeNull();

    render(await DefaultRecipe(forsideProps(bok.id)));
    expect(screen.getByText("Slå opp i boken")).toBeInTheDocument();
  });

  it("fremmede pynter ikke forsiden din", async () => {
    const { bok } = await makeKokebok();
    const annen = await makeKokebok();
    hoisted.userId = annen.user.id;

    const skjema = new FormData();
    skjema.set("beskrivelse", "kuppet forside");
    await settBokForside(bok.id, skjema);

    const rad = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.urørt");
    expect(rad.beskrivelse).toBeNull();
  });

  it("kapitlene står lukket når boken åpnes", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    render(await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bok.id) }) }));

    const kapittel = screen.getByText("Gjærbakst").closest("details");
    expect(kapittel).not.toBeNull();
    expect(kapittel).not.toHaveAttribute("open");
  });
});
