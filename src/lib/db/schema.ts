import {
  timestamp,
  date,
  pgTable,
  text,
  primaryKey,
  integer,
  real,
  uuid,
  unique,
  check,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import type { AdapterAccount } from 'next-auth/adapters';

// ========= Oppskriftsinnhold (jsonb) =========
// Strukturert innhold: ingredienser med mengde/enhet (originalen bevares — visning kan konvertere,
// se src/lib/enheter.ts), steg som refererer ingrediensene de bruker (bakeviewet fletter mengdene
// inn i steget), og opprinnelsen som følger oppskriften når den deles.

// Enhetene en mengde kan oppgis i. Originalenheten lagres alltid — "9 dl mel" forblir 9 dl,
// konvertering til gram er ren visning.
export const enheter = ['g', 'kg', 'dl', 'l', 'ml', 'ss', 'ts', 'stk', 'pakke', 'boks', 'glass', 'fedd', 'bunt', 'klype', 'pose'] as const;
export type Enhet = (typeof enheter)[number];

export type Ingrediens = z.infer<typeof ingrediensSchema>;
const ingrediensSchema = z.object({
  // stabil id (slug) som stegene refererer til
  id: z.string(),
  navn: z.string(),
  mengde: z.number().nullable(),
  enhet: z.enum(enheter).nullable(),
  kommentar: z.string().nullable(),
  // "Deig" / "Fyll" / null — visningen grupperer ingredienslista etter denne
  gruppe: z.string().nullable(),
});

export type Steg = z.infer<typeof stegSchema>;
const stegSchema = z.object({
  id: z.string(),
  tekst: z.string(),
  // ids fra ingredienslista som brukes i dette steget — bakeviewet viser mengdene i selve steget
  ingredienser: z.array(z.string()),
  // satt når steget er venting (heving, steking, avkjøling)
  passiv: z.nullable(z.object({
    hva: z.string(),
    minutter: z.number().nullable(),
  })),
  // true når steget kan gjøres MENS forrige venting pågår ("lag fyllet mens deigen hever") —
  // bakeviewet viser da ventingen som et "imens"-kort ved siden av. Se src/lib/steg.ts.
  imens: z.boolean(),
});

export type Opprinnelse = z.infer<typeof opprinnelseSchema>;
export const opprinnelseSchema = z.object({
  type: z.enum(['person', 'nettside', 'bok', 'blad', 'egen', 'annet']),
  navn: z.string(),
  url: z.string().nullable(),
  historie: z.string().nullable(),
});

export type RecipeContent = z.infer<typeof recipeContentSchema>;
export const recipeContentSchema = z.object({
  info: z.object({
    porsjoner: z.object({
      antall: z.number(),
      // "boller", "porsjoner", "stykker" — vises som "16 boller"
      benevnelse: z.string(),
    }),
    // porsjonsmultiplikatoren (½×/2×/4×) gir ikke mening for alle retter (en langpannekake er
    // bundet til pannen sin) — false skjuler den. default, ikke migrering: gamle rader får true.
    kanSkaleres: z.boolean().default(true),
    aktivTidMinutter: z.number().nullable(),
    // fra du starter til det er spiseklart — ikke mulig på alle oppskrifter, men nyttig når den finnes
    totalTidMinutter: z.number().nullable(),
    stekeinfo: z.nullable(z.object({
      graderCelsius: z.number(),
      varme: z.enum(['over_under', 'varmluft', 'grill']).nullable(),
      minutter: z.number(),
    })),
  }),

  opprinnelse: opprinnelseSchema.nullable(),
  ingredienser: z.array(ingrediensSchema),
  steg: z.array(stegSchema),

  ferdigprodukt: z.object({
    bilder: z.array(z.string()),
    tekst: z.string().nullable(),
  }),
});

// En bok er i utgangspunktet privat for eieren. 'utstilt' setter den frem på forsiden for alle
// (lesbar, aldri redigerbar) — utvalget en utlogget gjest får se.
export const bokSynligheter = ['privat', 'utstilt'] as const;
export type BokSynlighet = (typeof bokSynligheter)[number];

// Stoffargene en bokrygg kan ha på hylla. null = ikke valgt — hylla veksler da selv.
export const bokFarger = ['terra', 'sage', 'ink', 'butter', 'vin', 'natt'] as const;
export type BokFarge = (typeof bokFarger)[number];

// Hylla kan sorteres på to vis (users.hylleSortering): brukerens egen rekkefølge, eller etter
// når boken sist ble åpnet av eieren sin.
export const hylleSorteringer = ['egen', 'sist-åpnet'] as const;
export type HylleSortering = (typeof hylleSorteringer)[number];

export const cookbook = pgTable('cookbook', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  synlighet: text('synlighet').$type<BokSynlighet>().notNull().default('privat'),
  farge: text('farge').$type<BokFarge>(),
  // bokbåndet mellom tittel og innhold: et mønsternavn (se src/lib/bok-utseende.ts) eller
  // nøkkelen til et opplastet bilde (bok/<id>/…webp)
  headerBilde: text('headerBilde'),
  // plassen på hylla i eierens egen sortering — null til boken første gang sorteres
  rekkefølge: integer('rekkefølge'),
  // når eieren sist slo opp i boken — driver "sist åpnet"-sorteringen
  sistÅpnet: timestamp('sistApnet', { mode: 'date', withTimezone: true }),
});

export const chapters = pgTable('chapters', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  cookbookId: uuid('cookbookId')
    .notNull()
    .references(() => cookbook.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  order: integer('order').notNull(),
}, (chapters) => [
  unique().on(chapters.cookbookId, chapters.order),
  check('order_starts_at_one', sql`"order" >= 1`),
]);

export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // boken eier oppskriften; kapitler bare kategoriserer. En oppskrift uten recipe_chapters-rad
  // er "ukategorisert" og listes for seg i innholdslista.
  cookbookId: uuid('cookbookId')
    .notNull()
    .references(() => cookbook.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  content: jsonb('content').notNull(),
  // satt = dette er et utkast av oppskriften den peker på: en kopi å eksperimentere i. Utkast
  // står utenfor kapitler og innholdslister, og kan tas i bruk (skrive over originalen) eller
  // forkastes. Forsvinner originalen, følger utkastene med.
  utkastAv: uuid('utkastAv').references((): AnyPgColumn => recipes.id, { onDelete: 'cascade' }),
});

// Manuell lenking innad i boken: skolebollen peker på vaniljekremen. Rettet kant — visningen
// viser begge retninger ("Se også" / "Brukes i").
export const recipeLinks = pgTable('recipe_links', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  fromRecipeId: uuid('fromRecipeId')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  toRecipeId: uuid('toRecipeId')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
}, (recipeLinks) => [
  unique().on(recipeLinks.fromRecipeId, recipeLinks.toRecipeId),
  check('no_self_link', sql`"fromRecipeId" <> "toRecipeId"`),
]);

export const recipeChapters = pgTable('recipe_chapters', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  recipeId: uuid('recipeId')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapterId')
    .notNull()
    .references(() => chapters.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
}, (recipeChapters) => [
  unique().on(recipeChapters.chapterId, recipeChapters.order),
  unique().on(recipeChapters.recipeId, recipeChapters.chapterId),
  check('recipe_order_starts_at_one', sql`"order" >= 1`),
]);

export const userOpenChapters = pgTable('user_open_chapters', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapterId')
    .notNull()
    .references(() => chapters.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
}, (userOpenChapters) => [
  unique().on(userOpenChapters.userId, userOpenChapters.chapterId),
]);

// Lapper "teipet på" en oppskrift: "husk jordbær til pynt", "denne var ikke god!". Kremhvite
// kort med en teipbit i bokens palett — fargen som lagres ER teipfargen. Personlige notater —
// de følger IKKE med når oppskriften deles.
export const notatFarger = ['terrakotta', 'rav', 'salvie', 'sand'] as const;
export type NotatFarge = (typeof notatFarger)[number];

export const recipeNotes = pgTable('recipe_notes', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  recipeId: uuid('recipeId')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tekst: text('tekst').notNull(),
  farge: text('farge').$type<NotatFarge>().notNull().default('terrakotta'),
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
});

// Marg-kommentarer — google-docs-følelsen: en liten merknad hengt på et bestemt steg.
// "Oi, denne ble svidd i kantene — prøv mindre egg neste gang." Personlige som lappene
// (følger ikke med ved deling), og de overlever redigering så lenge steget består.
export const recipeComments = pgTable('recipe_comments', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  recipeId: uuid('recipeId')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // id-en til steget kommentaren henger på (fra content.steg)
  stegId: text('stegId').notNull(),
  tekst: text('tekst').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
});

// Favoritter — hjertemerkede oppskrifter. Samlingen er sin egen "bok" på hylla (/favoritter).
export const recipeFavorites = pgTable('recipe_favorites', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recipeId: uuid('recipeId')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
}, (recipeFavorites) => [
  unique().on(recipeFavorites.userId, recipeFavorites.recipeId),
]);

// Delingslenke for en oppskrift — selve raden ER tokenet (id i URL-en). Én lenke per oppskrift;
// deling er idempotent. Opprinnelsen ligger i content og følger dermed med på kjøpet.
export const recipeShares = pgTable('recipe_shares', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  recipeId: uuid('recipeId')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' })
    .unique(),
  createdAt: timestamp('createdAt', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
});


// ========= Planer =========
// En plan ("17. mai-frokost", "julebakst") samler oppskrifter på tvers av bøkene dine — nesten
// som en kokebok, men for en anledning. Personlig som lappene; oppskriftene bare refereres, så
// planen verken eier eller flytter noe. Handlelisten regnes ut fra oppskriftene ved visning.

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // dagen det skal stå på bordet — valgfri ("julebakst" trenger ingen dato)
  dato: date('dato'),
});

export const planRecipes = pgTable('plan_recipes', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  planId: uuid('planId')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  recipeId: uuid('recipeId')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  // størrelsen oppskriften ble lagt til i (½/1/2/4) — handlelisten ganger mengdene med denne
  ganger: real('ganger').notNull().default(1),
}, (planRecipes) => [
  unique().on(planRecipes.planId, planRecipes.recipeId),
  unique().on(planRecipes.planId, planRecipes.order),
  check('plan_order_starts_at_one', sql`"order" >= 1`),
]);


// ========= OAuth =========


export const users = pgTable('user', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  // hvordan hylla på forsiden sorteres — brukerens eget valg, husket mellom besøk
  hylleSortering: text('hylleSortering').$type<HylleSortering>().notNull().default('egen'),
});

export const accounts = pgTable('account', {
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<AdapterAccount['type']>().notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (account) => [
  primaryKey({ columns: [account.provider, account.providerAccountId] }),
]);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verificationToken', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (vt) => [
  primaryKey({ columns: [vt.identifier, vt.token] }),
]);
