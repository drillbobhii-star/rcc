import { sql } from 'drizzle-orm';
import { pgTable, uuid, timestamp, text, primaryKey, index, check, date } from 'drizzle-orm/pg-core';

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

export const scriptCopies = pgTable('script_copies', {
  scriptId: text('script_id').notNull(),
  visitorId: uuid('visitor_id').notNull(),
  day: date('day').notNull().default(sql`CURRENT_DATE`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.scriptId, table.visitorId, table.day] }),
  index('script_copies_date_idx').on(table.createdAt)]);
