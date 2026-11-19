import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const breathewiseActions = pgTable('breathewise_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull(),
  actionType: text('action_type').notNull(),
  co2Kg: numeric('co2_kg', { precision: 8, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('breathewise_actions_session_created_idx').on(table.sessionId, table.createdAt)])
