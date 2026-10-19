import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';

export const visitors = pgTable('visitors', {
  id: uuid().primaryKey(),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
});
