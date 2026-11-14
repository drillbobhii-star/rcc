import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, text, primaryKey, index, check, boolean, jsonb } from 'drizzle-orm/pg-core';

export const visitors = pgTable('visitors', {
  id: uuid().primaryKey(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

export const favorites = pgTable('favorites', {
  userId: text('user_id').notNull(),
  scriptId: text('script_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.userId, table.scriptId] })]);

export const votes = pgTable('votes', {
  userId: text('user_id').notNull(),
  scriptId: text('script_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.userId, table.scriptId] }), index('votes_script_idx').on(table.scriptId)]);

export const comments = pgTable('comments', {
  id: uuid().primaryKey().defaultRandom(),
  scriptId: text('script_id').notNull(),
  userId: text('user_id').notNull(),
  author: text().notNull(),
  body: text().notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('comments_script_date_idx').on(table.scriptId, table.createdAt),
  check('comments_body_length', sql`char_length(${table.body}) between 1 and 2000`)]);

// One counted action per browser, script, type and UTC day.
export const catalogActions = pgTable('catalog_actions', {
  visitorId: uuid('visitor_id').notNull(),
  scriptId: text('script_id').notNull(),
  action: text().notNull(),
  day: text().notNull(),
}, table => [primaryKey({ columns: [table.visitorId, table.scriptId, table.action, table.day] }),
  index('catalog_actions_script_idx').on(table.scriptId),
  check('catalog_actions_type', sql`${table.action} in ('copy', 'download')`)]);

// Anonymous browser journey, separate from account data.
export const browserJourneys = pgTable('browser_journeys', {
  id: uuid().primaryKey(),
  completed: boolean().notNull().default(false),
  state: jsonb().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const memberProfiles = pgTable('member_profiles', {
  userId: text('user_id').primaryKey(),
  avatarUrl: text('avatar_url').notNull().default(''),
  bannerUrl: text('banner_url').notNull().default(''),
  bio: text().notNull().default(''),
  robloxId: text('roblox_id').notNull().default(''),
  robloxUsername: text('roblox_username').notNull().default(''),
  showRoblox: boolean('show_roblox').notNull().default(false),
  nameEffect: text('name_effect').notNull().default('none'),
  bannerEffect: text('banner_effect').notNull().default('none'),
  isCreator: boolean('is_creator').notNull().default(false),
  displayName: text('display_name').notNull(),
  textColor: text('text_color').notNull().default('#dce6f5'),
}, table => [check('member_profiles_display_name_check', sql`char_length(${table.displayName}) between 1 and 80`),
  check('member_profiles_text_color_check', sql`${table.textColor} ~ '^#[a-fA-F0-9]{6}$'`)]);

// One-time imports keep old account content from reappearing after deletion.
export const communityImports = pgTable('community_imports', {
  key: text().primaryKey(),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
});
