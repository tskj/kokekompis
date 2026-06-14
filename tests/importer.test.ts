import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipes, recipeChapters, recipeContentSchema } from "@/lib/db/schema";
import { encodeUuidToBase32 } from "@/lib/uuid/uuid-base32";
import { makeKokebok, resetDb } from "./db";

const hoisted = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (hoisted.userId ? { user: { id: hoisted.userId } } : null)) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

import { importerFraUrl, importerFraBilde, importerFraTekst } from "@/app/actions/importer";

// Det modellen "svarer" med — en gyldig ekstrahert oppskrift etter skjemaet i schema.ts.
const EKSTRAHERT = {
  tittel: "Vafler fra nettet",
  beskrivelse: "Klassiske vafler",
  info: {
    porsjoner: { antall: 4, benevnelse: "porsjoner" },
    aktivTidMinutter: 20,
    totalTidMinutter: 50,
    stekeinfo: null,
  },
  opprinnelse: { type: "nettside", navn: "Matbloggen", url: null, historie: null },
  ingredienser: [
    { id: "hvetemel", navn: "hvetemel", mengde: 4, enhet: "dl", kommentar: null, gruppe: null },
    { id: "melk", navn: "melk", mengde: 5, enhet: "dl", kommentar: null, gruppe: null },
  ],
  steg: [
    { id: "rore", tekst: "Visp sammen mel og melk.", ingredienser: ["hvetemel", "melk"], passiv: null, imens: false },
    { id: "svelling", tekst: "La røra svelle.", ingredienser: [], passiv: { hva: "svelling", minutter: 30 }, imens: false },
  ],
};

function openAISvar(payload: unknown): Response {
  return new Response(JSON.stringify({ output_text: JSON.stringify(payload) }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function urlSkjema(kapittelId: string | "ingen", url = "https://www.matbloggen.no/vafler") {
  const formData = new FormData();
  formData.set("url", url);
  formData.set("kapittel", kapittelId === "ingen" ? "ingen" : encodeUuidToBase32(kapittelId));

  return formData;
}

// Hele siden slik en Ctrl/Cmd+A-kopi ser ut: oppskriften druknet i meny, cookie-banner, kommentarer
// og "andre oppskrifter du kanskje liker". Modellen (her mocket) skal plukke ut bare oppskriften.
const LIMT_SIDE = [
  "Hjem  Oppskrifter  Om oss  Logg inn  Søk …",
  "Vi bruker informasjonskapsler for å gi deg en bedre opplevelse. Godta alle.",
  "Vafler",
  "Av Kari Nordmann · 12 kommentarer · Del på Facebook · Del på Pinterest",
  "Ingredienser: 4 dl hvetemel, 5 dl melk",
  "Slik gjør du: Visp sammen mel og melk. La røra svelle i 30 minutter.",
  "Andre oppskrifter du kanskje liker: Pannekaker · Lapper · Sveler",
  "Skriv en kommentar … Abonner på nyhetsbrevet vårt! © 2026 Matbloggen",
].join("\n");

function tekstSkjema(kapittelId: string | "ingen", tekst = LIMT_SIDE) {
  const formData = new FormData();
  formData.set("tekst", tekst);
  formData.set("kapittel", kapittelId === "ingen" ? "ingen" : encodeUuidToBase32(kapittelId));

  return formData;
}

describe("AI-import (ekte actions og database, mocket nett og OpenAI)", () => {
  beforeEach(async () => {
    hoisted.userId = "";
    await resetDb();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("henter en side, ekstraherer, lagrer i valgt kapittel — og opprinnelsen peker på kilden", async () => {
    const { user, bok, kapittel, oppskrift: eksisterende } = await makeKokebok();
    hoisted.userId = user.id;
    vi.stubEnv("OPENAI_API_KEY", "test-nøkkel");

    const fetchSpy = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      void init;
      if (String(url).includes("matbloggen")) return new Response("<html><body><h1>Vafler</h1>4 dl mel, 5 dl melk</body></html>");
      if (String(url).includes("api.openai.com")) return openAISvar(EKSTRAHERT);

      throw new Error("uventet fetch: " + String(url));
    });
    vi.stubGlobal("fetch", fetchSpy);

    const feil = await importerFraUrl(bok.id, urlSkjema(kapittel.id)).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:.*\/oppskrift\//);

    const nye = await db.select().from(recipes).where(eq(recipes.title, "Vafler fra nettet"));
    expect(nye).toHaveLength(1);
    expect(nye[0].cookbookId).toBe(bok.id);

    const content = recipeContentSchema.parse(nye[0].content);
    expect(content.opprinnelse?.type).toBe("nettside");
    expect(content.opprinnelse?.url).toBe("https://www.matbloggen.no/vafler");
    expect(content.opprinnelse?.navn).toBe("Matbloggen");
    expect(content.ingredienser[0].enhet).toBe("dl");

    // havner sist i kapitlet, etter den eksisterende oppskriften
    const lenke = await db
      .select()
      .from(recipeChapters)
      .where(eq(recipeChapters.recipeId, nye[0].id))
      .single("test.kapittellenke");
    expect(lenke.chapterId).toBe(kapittel.id);
    expect(lenke.order).toBe(2);

    // OpenAI-kallet gikk med riktig nøkkel og strukturert format
    const openAIKall = fetchSpy.mock.calls.find(([u]) => String(u).includes("api.openai.com"));
    const init = openAIKall![1]!;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-nøkkel");
    const body = JSON.parse(String(init.body));
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);

    void eksisterende;
  });

  it("kan importere rett til ukategorisert", async () => {
    const { user, bok } = await makeKokebok();
    hoisted.userId = user.id;
    vi.stubEnv("OPENAI_API_KEY", "test-nøkkel");

    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("api.openai.com")) return openAISvar(EKSTRAHERT);

      return new Response("<html>oppskrift</html>");
    }));

    const feil = await importerFraUrl(bok.id, urlSkjema("ingen")).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:.*\/oppskrift\//);

    const nye = await db.select().from(recipes).where(eq(recipes.title, "Vafler fra nettet"));
    expect(nye).toHaveLength(1);

    const lenker = await db.select().from(recipeChapters).where(eq(recipeChapters.recipeId, nye[0].id));
    expect(lenker).toHaveLength(0);
  });

  it("sender bildet som data-url til OpenAI og lagrer resultatet", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    hoisted.userId = user.id;
    vi.stubEnv("OPENAI_API_KEY", "test-nøkkel");

    const fetchSpy = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      void url; void init;
      return openAISvar({ ...EKSTRAHERT, tittel: "Tante Idas eplekake", opprinnelse: { type: "person", navn: "Tante Ida", url: null, historie: null } });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const formData = new FormData();
    formData.set("bilde", new File([Buffer.from("liksom-et-bilde")], "kort.jpg", { type: "image/jpeg" }));
    formData.set("kapittel", encodeUuidToBase32(kapittel.id));

    const feil = await importerFraBilde(bok.id, formData).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:.*\/oppskrift\//);

    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]!.body));
    const brukerInnhold = body.input[1].content;
    expect(brukerInnhold[1].type).toBe("input_image");
    expect(brukerInnhold[1].image_url).toMatch(/^data:image\/jpeg;base64,/);

    const nye = await db.select().from(recipes).where(eq(recipes.title, "Tante Idas eplekake"));
    expect(nye).toHaveLength(1);
    expect(recipeContentSchema.parse(nye[0].content).opprinnelse?.navn).toBe("Tante Ida");
  });

  it("feil fra OpenAI sender deg tilbake til importsiden med beskjed — og lagrer ingenting", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    hoisted.userId = user.id;
    vi.stubEnv("OPENAI_API_KEY", "test-nøkkel");

    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("api.openai.com")) return new Response("kaputt", { status: 500 });

      return new Response("<html>oppskrift</html>");
    }));

    const feil = await importerFraUrl(bok.id, urlSkjema(kapittel.id)).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:.*\/importer\?feil=/);

    const alle = await db.select().from(recipes).where(eq(recipes.cookbookId, bok.id));
    expect(alle).toHaveLength(1); // bare den fra makeKokebok
  });

  it("to samtidige importer av samme lenke deler ETT OpenAI-kall og gir ÉN oppskrift", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    hoisted.userId = user.id;
    vi.stubEnv("OPENAI_API_KEY", "test-nøkkel");

    const fetchSpy = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("api.openai.com")) {
        // hold AI-svaret åpent et øyeblikk så begge kallene rekker å være i flukt samtidig
        await new Promise((r) => setTimeout(r, 50));
        return openAISvar(EKSTRAHERT);
      }

      return new Response("<html>vafler</html>");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const [a, b] = await Promise.all([
      importerFraUrl(bok.id, urlSkjema(kapittel.id)).then(() => null, (e: Error) => e),
      importerFraUrl(bok.id, urlSkjema(kapittel.id)).then(() => null, (e: Error) => e),
    ]);
    expect(a?.message).toMatch(/^NEXT_REDIRECT:.*\/oppskrift\//);
    expect(b?.message).toMatch(/^NEXT_REDIRECT:.*\/oppskrift\//);

    const openAIKall = fetchSpy.mock.calls.filter(([u]) => String(u).includes("api.openai.com"));
    expect(openAIKall).toHaveLength(1);

    const rader = await db.select().from(recipes).where(eq(recipes.title, "Vafler fra nettet"));
    expect(rader).toHaveLength(1);
  });

  it("en lenke som alt står i boken re-importeres ikke — du sendes til oppskriften du har", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    hoisted.userId = user.id;
    vi.stubEnv("OPENAI_API_KEY", "test-nøkkel");

    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("api.openai.com")) return openAISvar(EKSTRAHERT);

      return new Response("<html>vafler</html>");
    }));

    await importerFraUrl(bok.id, urlSkjema(kapittel.id)).catch(() => {});

    // runde to: ingen fetch i det hele tatt — verken siden eller OpenAI
    const andreRunde = vi.fn();
    vi.stubGlobal("fetch", andreRunde);

    const feil = await importerFraUrl(bok.id, urlSkjema(kapittel.id)).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:.*\/oppskrift\//);
    expect(andreRunde).not.toHaveBeenCalled();

    const rader = await db.select().from(recipes).where(eq(recipes.title, "Vafler fra nettet"));
    expect(rader).toHaveLength(1);
  });

  it("avviser adresser som ikke er offentlige http(s)-verter", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    hoisted.userId = user.id;

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    for (const adresse of ["http://localhost:3000/hemmelig", "http://192.168.1.1/", "ftp://filer.no/x", "ikke en url"]) {
      const feil = await importerFraUrl(bok.id, urlSkjema(kapittel.id, adresse)).then(() => null, (e: Error) => e);
      expect(feil?.message).toMatch(/^NEXT_REDIRECT:.*\/importer\?feil=/);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("limer inn hele siden, sender alt til modellen og lagrer oppskriften — uten å hente noe på nett", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    hoisted.userId = user.id;
    vi.stubEnv("OPENAI_API_KEY", "test-nøkkel");

    const fetchSpy = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      void init;
      if (String(url).includes("api.openai.com")) return openAISvar(EKSTRAHERT);

      throw new Error("uventet fetch: " + String(url));
    });
    vi.stubGlobal("fetch", fetchSpy);

    const feil = await importerFraTekst(bok.id, tekstSkjema(kapittel.id)).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:.*\/oppskrift\//);

    // ingen nett-fetch — bare OpenAI ble kalt (poenget: lenken funket ikke, så vi limte inn)
    const nettkall = fetchSpy.mock.calls.filter(([u]) => !String(u).includes("api.openai.com"));
    expect(nettkall).toHaveLength(0);

    // hele den innlimte siden gikk til modellen — rot og alt; den skal selv skille ut oppskriften
    const openAIKall = fetchSpy.mock.calls.find(([u]) => String(u).includes("api.openai.com"));
    const body = JSON.parse(String(openAIKall![1]!.body));
    expect(body.input[1].content).toContain("Visp sammen mel og melk");
    expect(body.input[1].content).toContain("Andre oppskrifter du kanskje liker");

    const nye = await db.select().from(recipes).where(eq(recipes.title, "Vafler fra nettet"));
    expect(nye).toHaveLength(1);
    expect(nye[0].cookbookId).toBe(bok.id);

    // innlimt tekst har ingen kilde-URL — opprinnelsen er det modellen leste ut, ikke tvunget til nettside
    const content = recipeContentSchema.parse(nye[0].content);
    expect(content.opprinnelse?.navn).toBe("Matbloggen");
    expect(content.opprinnelse?.url).toBeNull();
    expect(content.ingredienser[0].enhet).toBe("dl");

    const lenke = await db
      .select()
      .from(recipeChapters)
      .where(eq(recipeChapters.recipeId, nye[0].id))
      .single("test.kapittellenke");
    expect(lenke.chapterId).toBe(kapittel.id);
    expect(lenke.order).toBe(2);
  });

  it("for kort eller tom innliming gir beskjed — ingenting lagres og modellen røres ikke", async () => {
    const { user, bok, kapittel } = await makeKokebok();
    hoisted.userId = user.id;
    vi.stubEnv("OPENAI_API_KEY", "test-nøkkel");

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const feil = await importerFraTekst(bok.id, tekstSkjema(kapittel.id, "vafler")).then(() => null, (e: Error) => e);
    expect(feil?.message).toMatch(/^NEXT_REDIRECT:.*\/importer\?feil=/);
    expect(fetchSpy).not.toHaveBeenCalled();

    const alle = await db.select().from(recipes).where(eq(recipes.cookbookId, bok.id));
    expect(alle).toHaveLength(1); // bare den fra makeKokebok
  });
});
