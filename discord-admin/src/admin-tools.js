const idPattern = /^\d{17,20}$/;
const SEND_MESSAGES = 1n << 11n;
const SEND_IN_THREADS = 1n << 38n;

function tool(name, description, properties = {}, required = Object.keys(properties)) {
  return { type: 'function', function: { name, description, parameters: {
    type: 'object', properties, required, additionalProperties: false
  } } };
}
const channelId = { channel_id: { type: 'string', description: 'ID exacto del canal del servidor.' } };
export const adminTools = [
  tool('purge_messages', 'Borra los últimos 1 a 100 mensajes de menos de 14 días de un canal de texto.', {
    ...channelId, count: { type: 'integer', minimum: 1, maximum: 100 }
  }),
  tool('lock_channel', 'Impide que @everyone escriba en el canal y sus hilos. Los permisos explícitos de roles y administradores siguen aplicándose.', channelId),
  tool('unlock_channel', 'Permite que @everyone vuelva a escribir en el canal y sus hilos.', channelId),
  tool('server_info', 'Consulta miembros, canales, boosts, nivel y fecha de creación del servidor.'),
  tool('user_info', 'Consulta por ID un usuario: fecha de creación, ingreso, roles y estado de baneo.', {
    user_id: { type: 'string', description: 'ID del usuario; no inventes IDs. Pídelo si no se conoce.' }
  })
];

const createdAt = id => new Date(Number((BigInt(id) >> 22n) + 1420070400000n)).toISOString();
export async function executeAdminTool(api, guildId, name, args, channels) {
  if (name === 'server_info') {
    const guild = await api(`/guilds/${guildId}?with_counts=true`);
    return { name: guild.name, id: guild.id, members: guild.approximate_member_count,
      online: guild.approximate_presence_count, channels: channels.length,
      boost_level: guild.premium_tier, boosts: guild.premium_subscription_count || 0,
      created_at: createdAt(guild.id), verification_level: guild.verification_level };
  }
  if (name === 'user_info') {
    if (!idPattern.test(args.user_id)) throw new Error('ID de usuario inválido.');
    const optional = async path => {
      try { return await api(path); } catch (error) {
        if (error.status === 404) return null;
        throw error;
      }
    };
    const [user, member, ban, roles] = await Promise.all([
      api(`/users/${args.user_id}`), optional(`/guilds/${guildId}/members/${args.user_id}`),
      optional(`/guilds/${guildId}/bans/${args.user_id}`), api(`/guilds/${guildId}/roles`)
    ]);
    return { id: user.id, username: user.username, bot: user.bot === true,
      created_at: createdAt(user.id), is_member: !!member, joined_at: member?.joined_at || null,
      nickname: member?.nick || null,
      roles: (member?.roles || []).map(id => ({ id, name: roles.find(role => role.id === id)?.name || id })),
      banned: !!ban, ban_reason: ban?.reason || null };
  }
  const channel = channels.find(item => item.id === args.channel_id);
  if (!channel || ![0, 5].includes(channel.type)) throw new Error('Selecciona un canal de texto del servidor autorizado.');
  if (name === 'purge_messages') {
    if (!Number.isInteger(args.count) || args.count < 1 || args.count > 100) throw new Error('La cantidad debe ser un entero entre 1 y 100.');
    const messages = await api(`/channels/${channel.id}/messages?limit=${args.count}`);
    // Small margin prevents messages crossing Discord’s age limit during the request.
    const cutoff = Date.now() - 14 * 86400000 + 60000;
    const ids = messages.filter(message => Date.parse(createdAt(message.id)) > cutoff).map(message => message.id);
    if (ids.length === 1) await api(`/channels/${channel.id}/messages/${ids[0]}`, { method: 'DELETE' });
    else if (ids.length > 1) await api(`/channels/${channel.id}/messages/bulk-delete`, { method: 'POST', body: { messages: ids } });
    return `Mensajes borrados: ${ids.length}. Omitidos por antigüedad: ${messages.length - ids.length}.`;
  }
  if (name === 'lock_channel' || name === 'unlock_channel') {
    const overwrite = channel.permission_overwrites?.find(item => item.id === guildId && item.type === 0);
    let allow = BigInt(overwrite?.allow || '0');
    let deny = BigInt(overwrite?.deny || '0');
    const bits = SEND_MESSAGES | SEND_IN_THREADS;
    if (name === 'lock_channel') { allow &= ~bits; deny |= bits; }
    else { deny &= ~bits; allow |= bits; }
    await api(`/channels/${channel.id}/permissions/${guildId}`, { method: 'PUT', body: {
      type: 0, allow: String(allow), deny: String(deny)
    } });
    return `Canal #${channel.name} ${name === 'lock_channel' ? 'bloqueado' : 'desbloqueado'} para @everyone. Los permisos explícitos de otros roles y administradores siguen aplicándose.`;
  }
  throw new Error('Herramienta no permitida.');
}
