// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cookbook } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb } from "./db";
import "./rtl";
import { fireEvent, render, screen } from "./rtl";

const hoisted = vi.hoisted(() => ({ userId: "", push: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect:  vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound:  vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: hoisted.push, prefetch: vi.fn(), back: vi.fn() })),
}));

import { settBokBeskrivelse, settBokSkisse } from "@/app/actions/bok";
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

  it("eieren velger akvarell og noen ord — og forsiden viser dem", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    const ord = new FormData();
    ord.set("beskrivelse", "Alt mormor aldri målte opp.");
    await settBokBeskrivelse(bok.id, ord);

    const tegning = new FormData();
    tegning.set("skisse", "croissant");
    await settBokSkisse(bok.id, tegning);

    const rad = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.forside");
    expect(rad.beskrivelse).toBe("Alt mormor aldri målte opp.");
    expect(rad.skisse).toBe("croissant");

    const { container } = render(await DefaultRecipe(forsideProps(bok.id)));
    expect(screen.getByText("Alt mormor aldri målte opp.")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.queryByText("Slå opp i boken")).not.toBeInTheDocument();
  });

  it("blyantskissene fra første runde er fortsatt gyldige valg", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    const skjema = new FormData();
    skjema.set("skisse", "bolle");
    await settBokSkisse(bok.id, skjema);
    expect((await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.blyant")).skisse).toBe("bolle");

    const { container } = render(await DefaultRecipe(forsideProps(bok.id)));
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("uten forside står oppslagshintet — og tullete skisser lagres ikke", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    const skjema = new FormData();
    skjema.set("skisse", "traktor");
    await settBokSkisse(bok.id, skjema);

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
    await settBokBeskrivelse(bok.id, skjema);

    const rad = await db.select().from(cookbook).where(eq(cookbook.id, bok.id)).single("test.urørt");
    expect(rad.beskrivelse).toBeNull();
  });

  it("et sveip over oppslaget blar inn i boken — vertikal scrolling blar ikke", async () => {
    const { user, bok, oppskrift } = await makeKokebok();
    hoisted.userId = user.id;
    hoisted.push.mockClear();

    const { container } = render(await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bok.id) }) }));
    const flate = container.querySelector(".bla-om")!.parentElement!;

    // et tydelig sveip mot venstre: fra forsiden inn på første oppskrift
    fireEvent.touchStart(flate, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(flate,  { changedTouches: [{ clientX: 180, clientY: 210 }] });
    expect(hoisted.push).toHaveBeenCalledTimes(1);
    expect(hoisted.push.mock.calls[0][0]).toContain(encodeUuidToBase32(oppskrift.id));

    // mest vertikal bevegelse er scrolling, ikke blaing
    hoisted.push.mockClear();
    fireEvent.touchStart(flate, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(flate,  { changedTouches: [{ clientX: 220, clientY: 400 }] });
    expect(hoisted.push).not.toHaveBeenCalled();
  });

  it("kapitlene står lukket når boken åpnes", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    render(await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bok.id) }) }));

    const summary = screen.getAllByText("Gjærbakst").find((el) => el.tagName === "SUMMARY");
    const kapittel = summary?.closest("details");
    expect(kapittel).not.toBeNull();
    expect(kapittel).not.toHaveAttribute("open");
  });
});
