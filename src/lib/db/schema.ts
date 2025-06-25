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

export type RecipeContent = z.infer<typeof recipeContentSchema>;
export const recipeContentSchema = z.object({
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.string(),
    unit: z.string().optional(),
  })),
  instructions: z.array(z.object({
    step: z.number(),
    instruction: z.string(),
  })),
  cookingTime: z.number().optional(),
  servings: z.number().optional(),
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
  title: text('title').notNull(),
  description: text('description'),
  content: jsonb('content').notNull(),
});

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
