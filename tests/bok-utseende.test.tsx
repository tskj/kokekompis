// @vitest-environment jsdom
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cookbook } from "@/lib/db/schema";
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
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn(), prefetch: vi.fn(), back: vi.fn() })),
}));

import { settBokFarge, settBokBånd, lastOppBokBånd } from "@/app/actions/bok";
import { lesBåndValg } from "@/lib/bok-utseende";
import CookbookLayout from "@/app/kokebok/[id]/layout";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";

function skjema(felt: string, verdi: string): FormData {
  const formData = new FormData();
  formData.set(felt, verdi);

  return formData;
}

async function testPng(): Promise<File> {
  const bytes = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 120, g: 90, b: 50 } },
  }).png().toBuffer();

  return new File([new Uint8Array(bytes)], "baand.png", { type: "image/png" });
}

async function bokRad(id: string) {
  return db.select().from(cookbook).where(eq(cookbook.id, id)).single("test.bok");
}

describe("bokas utseende (farge, bånd og opplastet båndbilde)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
    vi.stubEnv("LOKAL_LAGRING_DIR", await mkdtemp(path.join(tmpdir(), "kokekompis-lagring-")));
  });

  it("eieren velger ryggfarge — fremmede og tullete verdier preller av", async () => {
    const { user, bok } = await makeKokebok();
    const fremmed = await makeKokebok();

    hoisted.userId = fremmed.user.id;
    await settBokFarge(bok.id, skjema("farge", "vin"));
    expect((await bokRad(bok.id)).farge).toBeNull();

    hoisted.userId = user.id;
    await settBokFarge(bok.id, skjema("farge", "rosa-glitter"));
    expect((await bokRad(bok.id)).farge).toBeNull();

    await settBokFarge(bok.id, skjema("farge", "vin"));
    expect((await bokRad(bok.id)).farge).toBe("vin");
  });

  it("mønsterbånd settes i valgt bokfarge og fjernes — og vises mellom tittel og innhold", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    // uten farge normaliseres til mønsterets standarddrakt; med farge lagres valget
    await settBokBånd(bok.id, skjema("valg", "ruter"));
    expect((await bokRad(bok.id)).headerBilde).toBe("ruter:sage");

    await settBokBånd(bok.id, skjema("valg", "ruter:vin"));
    expect((await bokRad(bok.id)).headerBilde).toBe("ruter:vin");

    // ukjent farge faller tilbake til standarddrakten; ukjent mønster preller av
    await settBokBånd(bok.id, skjema("valg", "ruter:rosa-glitter"));
    expect((await bokRad(bok.id)).headerBilde).toBe("ruter:sage");

    await settBokBånd(bok.id, skjema("valg", "paljetter:vin"));
    expect((await bokRad(bok.id)).headerBilde).toBe("ruter:sage");

    render(await CookbookLayout({ recipe: null, params: Promise.resolve({ id: encodeUuidToBase32(bok.id) }) }));
    expect(screen.getByTestId("bokbaand")).toBeInTheDocument();

    await settBokBånd(bok.id, skjema("valg", "fjern"));
    expect((await bokRad(bok.id)).headerBilde).toBeNull();
  });

  it("eldre rader med bare mønsternavn leses fortsatt — i mønsterets standarddrakt", () => {
    expect(lesBåndValg("striper")).toEqual({ mønster: "striper", farge: "terra" });
    expect(lesBåndValg("prikker:natt")).toEqual({ mønster: "prikker", farge: "natt" });
    expect(lesBåndValg("bok/abc/baand-x.webp")).toBeNull();
  });

  it("eget båndbilde lastes opp som webp i bokens mappe — og ryddes når mønster tar over", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;

    const formData = new FormData();
    formData.set("bilde", await testPng());
    await lastOppBokBånd(bok.id, formData);

    const key = (await bokRad(bok.id)).headerBilde;
    expect(key).toMatch(new RegExp(`^bok/${bok.id}/baand-[0-9a-f-]+\\.webp$`));

    const meta = await sharp(path.join(process.env.LOKAL_LAGRING_DIR!, key!)).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1600);
    expect(meta.height).toBe(400);

    // mønsteret tar over og filen ryddes bort
    await settBokBånd(bok.id, skjema("valg", "striper"));
    expect((await bokRad(bok.id)).headerBilde).toBe("striper:terra");
    await expect(sharp(path.join(process.env.LOKAL_LAGRING_DIR!, key!)).metadata()).rejects.toThrow();
  });

  it("en fremmed får ikke lastet opp bånd på boken din", async () => {
    const { bok } = await makeKokebok();
    const fremmed = await makeKokebok();
    hoisted.userId = fremmed.user.id;

    const formData = new FormData();
    formData.set("bilde", await testPng());
    await lastOppBokBånd(bok.id, formData);

    expect((await bokRad(bok.id)).headerBilde).toBeNull();
  });
});
