import { getDatabase } from '@netlify/database';

// No interaction tokens or credentials are stored. Claiming is atomic across instances.
export const pendingActions = {
  async set(id, payload) {
    const db = getDatabase();
    await db.sql`DELETE FROM discord_pending_actions WHERE expires_at < now()`;
    await db.sql`INSERT INTO discord_pending_actions (id, user_id, guild_id, payload, expires_at)
      VALUES (${id}, ${payload.userId}, ${payload.guildId}, ${JSON.stringify(payload)}::jsonb, ${new Date(payload.expiresAt)})`;
  },
  async get(id) {
    const rows = await getDatabase().sql`SELECT payload FROM discord_pending_actions WHERE id = ${id}`;
    return rows[0]?.payload || null;
  },
  async delete(id) {
    await getDatabase().sql`DELETE FROM discord_pending_actions WHERE id = ${id}`;
  },
  async claim(id, userId, guildId) {
    const rows = await getDatabase().sql`DELETE FROM discord_pending_actions
      WHERE id = ${id} AND user_id = ${userId} AND guild_id = ${guildId} AND expires_at > now() RETURNING id`;
    return rows.length === 1;
  }
};
