import { sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, text, primaryKey, index, check } from 'drizzle-orm/pg-core';

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
