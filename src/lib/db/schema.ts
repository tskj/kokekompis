import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  uuid,
  unique,
  check,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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

export const cookbook = pgTable('cookbook', {
  id: uuid('id').defaultRandom().notNull().primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
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


// ========= OAuth =========


export const users = pgTable('user', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
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
