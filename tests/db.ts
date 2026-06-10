import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, cookbook, recipeChapters, recipes, users, recipeContentSchema, type RecipeContent } from "@/lib/db/schema";

const ALL_TABLES = [
  '"user"',
  '"account"',
  '"session"',
  '"verificationToken"',
  '"cookbook"',
  '"chapters"',
  '"recipes"',
  '"recipe_chapters"',
  '"recipe_notes"',
  '"recipe_shares"',
  '"recipe_links"',
  '"recipe_favorites"',
  '"user_open_chapters"',
].join(", ");

export async function resetDb(): Promise<void> {
  await db.execute(sql.raw(`truncate table ${ALL_TABLES} restart identity cascade`));
}

// Et lite men komplett oppskriftsinnhold: to ingredienser i hver sin gruppe, et aktivt steg som
// refererer dem, og et passivt hevesteg — nok til å øve både flettingen og parallellvisningen.
export function testOppskrift(overrides?: Partial<RecipeContent>): RecipeContent {
  return recipeContentSchema.parse({
    info: {
      porsjoner: { antall: 12, benevnelse: "boller" },
      aktivTidMinutter: 30,
      totalTidMinutter: 120,
      stekeinfo: { graderCelsius: 220, varme: "over_under", minutter: 12 },
    },
    opprinnelse: {
      type: "person",
      navn: "Mormor",
      url: null,
      historie: "Fra kjøkkenet på Sotra.",
    },
    ingredienser: [
      { id: "hvetemel", navn: "hvetemel", mengde: 9, enhet: "dl", kommentar: null, gruppe: "Deig" },
      { id: "sukker", navn: "sukker", mengde: 1, enhet: "dl", kommentar: null, gruppe: "Deig" },
      { id: "kanel", navn: "kanel", mengde: 2, enhet: "ss", kommentar: null, gruppe: "Fyll" },
    ],
    steg: [
      { id: "elt", tekst: "Elt sammen mel og sukker.", ingredienser: ["hvetemel", "sukker"], passiv: null, imens: false },
      { id: "heving", tekst: "La deigen heve.", ingredienser: [], passiv: { hva: "heving", minutter: 60 }, imens: false },
      { id: "fyll", tekst: "Strø over kanel.", ingredienser: ["kanel"], passiv: null, imens: true },
    ],
    ferdigprodukt: { bilder: [], tekst: "Gylne og myke." },
    ...overrides,
  });
}

// En bruker med kokebok, ett kapittel og én oppskrift lenket inn — utgangspunktet de fleste
// testene trenger. Innholdet kan overstyres per test.
export async function makeKokebok(opts?: { content?: RecipeContent; title?: string }) {
  const user = await db
    .insert(users)
    .values({ id: randomUUID(), name: "Maren Test", email: `${randomUUID()}@example.test` })
    .returning()
    .single("test.create-user");

  const bok = await db
    .insert(cookbook)
    .values({ userId: user.id, name: "Testkokeboka" })
    .returning()
    .single("test.create-cookbook");

  const kapittel = await db
    .insert(chapters)
    .values({ cookbookId: bok.id, name: "Gjærbakst", order: 1 })
    .returning()
    .single("test.create-chapter");

  const oppskrift = await db
    .insert(recipes)
    .values({
      userId: user.id,
      cookbookId: bok.id,
      title: opts?.title ?? "Testboller",
      description: "En testoppskrift",
      content: opts?.content ?? testOppskrift(),
    })
    .returning()
    .single("test.create-recipe");

  await db.insert(recipeChapters).values({ recipeId: oppskrift.id, chapterId: kapittel.id, order: 1 });

  return { user, bok, kapittel, oppskrift };
}
