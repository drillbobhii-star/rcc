type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RCC_ADMIN_EMAIL?: string;
  RCC_KOFI_MONTHLY_URL?: string;
  DISCORD_WEBHOOK_URL?: string;
  RCC_VIP_API_URL?: string;
  RCC_VIP_WEBHOOK_SECRET?: string;
};

type AuthUser = {
  id: string;
  email?: string;
  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> }>;
  user_metadata?: Record<string, unknown>;
};

const PROJECT_URL = 'https://cbkrpyfkteomcukdisdw.supabase.co';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function monthlyUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['ko-fi.com', 'www.ko-fi.com'].includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

async function authUser(request: Request, env: Env): Promise<AuthUser | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const base = (env.SUPABASE_URL || PROJECT_URL).replace(/\/+$/, '');
  if (!env.SUPABASE_ANON_KEY) throw new Error('SUPABASE_ANON_KEY no está configurada.');
  const response = await fetch(base + '/auth/v1/user', {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;
  const user = await response.json() as AuthUser;
  return user?.id ? user : null;
}

function serviceHeaders(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada.');
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  };
}

async function readMembership(base: string, env: Env, userId: string) {
  const response = await fetch(base + '/rest/v1/rcc_vip_memberships?user_id=eq.' + encodeURIComponent(userId) + '&select=is_vip&limit=1', {
    headers: serviceHeaders(env),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('No se pudo consultar la membresía.');
  const rows = await response.json() as Array<{ is_vip: boolean }>;
  return rows[0]?.is_vip === true;
}

async function findUserByEmail(base: string, env: Env, email: string): Promise<AuthUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) return null;
  for (let page = 1; page <= 20; page++) {
    const url = new URL(base + '/auth/v1/admin/users');
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '1000');
    const response = await fetch(url, { headers: serviceHeaders(env), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('No se pudo consultar la lista de usuarios.');
    const payload = await response.json() as { users?: AuthUser[] };
    const users = Array.isArray(payload.users) ? payload.users : [];
    const match = users.find(user => user.email?.toLowerCase() === normalized);
    if (match) return match;
    if (users.length < 1000) break;
  }
  return null;
}

async function grantDiscordRole(env: Env, discordId: string) {
  if (!env.RCC_VIP_API_URL || !env.RCC_VIP_WEBHOOK_SECRET) return false;
  const endpoint = new URL(env.RCC_VIP_API_URL);
  if (endpoint.protocol !== 'https:') throw new Error('RCC_VIP_API_URL debe usar HTTPS.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RCC_VIP_WEBHOOK_SECRET,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ discord_id: discordId }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Railway no pudo asignar el rol VIP de Discord (HTTP ' + response.status + ').');
  return true;
}

async function notifyDiscord(env: Env, email: string, isVip: boolean, adminEmail: string) {
  const webhook = env.DISCORD_WEBHOOK_URL;
  if (!webhook || !/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(webhook)) return false;
  try {
    const response = await fetch(webhook + '?wait=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [{
          title: isVip ? '💎 RCC Supporter activado' : 'RCC Supporter desactivado',
          color: isVip ? 11511287 : 8421504,
          fields: [
            { name: 'Miembro', value: email.slice(0, 250) },
            { name: 'Estado', value: isVip ? 'VIP activo' : 'VIP retirado' },
            { name: 'Acción de administrador', value: adminEmail.slice(0, 250) },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (!['GET', 'POST'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Origen no permitido.' }, 403);

  const base = (env.SUPABASE_URL || PROJECT_URL).replace(/\/+$/, '');
  const RCC_KOFI_MONTHLY_URL = env.RCC_KOFI_MONTHLY_URL?.trim() || 'https://ko-fi.com/lubensdrill/tiers';
  const checkoutUrl = monthlyUrl(RCC_KOFI_MONTHLY_URL);

  try {
    if (request.method === 'GET') {
      const tokenPresent = request.headers.has('authorization');
      const user = await authUser(request, env);
      if (tokenPresent && !user) return reply({ error: 'La sesión no es válida.' }, 401);
      if (!user) return reply({ isVip: false, isAdmin: false, checkoutUrl });

      const isVip = await readMembership(base, env, user.id);
      const adminEmail = env.RCC_ADMIN_EMAIL?.trim().toLowerCase();
      return reply({
        isVip,
        isAdmin: Boolean(adminEmail && user.email?.toLowerCase() === adminEmail),
        checkoutUrl,
      });
    }

    if (Number(request.headers.get('content-length')) > 2048) return reply({ error: 'Solicitud demasiado grande.' }, 413);
    const user = await authUser(request, env);
    if (!user) return reply({ error: 'Inicia sesión para continuar.' }, 401);
    if (!env.SUPABASE_SERVICE_ROLE_KEY) return reply({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY.' }, 503);
    const body = await request.json() as { action?: unknown; email?: unknown; userId?: unknown; isVip?: unknown };

    if (body.action === 'linkDiscord') {
      const identity = user.identities?.find(item => item.provider === 'discord');
      const identityData = identity?.identity_data || {};
      const discordId = [identityData.sub, identityData.user_id, identityData.id]
        .find(value => typeof value === 'string' && /^\\d{17,20}$/.test(value)) as string | undefined;
      if (!discordId) return reply({ error: 'No encontramos una identidad Discord vinculada. Completa primero el paso de Discord OAuth.' }, 409);

      const profileQuery = new URL(base + '/rest/v1/profiles');
      profileQuery.searchParams.set('user_id', 'eq.' + user.id);
      const profileUpdate = await fetch(profileQuery, {
        method: 'PATCH',
        headers: { ...serviceHeaders(env), Prefer: 'return=representation' },
        body: JSON.stringify({ discord_id: discordId }),
        signal: AbortSignal.timeout(10000),
      });
      if (!profileUpdate.ok) return reply({ error: 'No se pudo guardar tu Discord en el perfil RCC.' }, 502);
      const updatedProfiles = await profileUpdate.json() as Array<{ user_id: string }>;

      if (updatedProfiles.length === 0) {
        const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
        const displayName = (typeof metadataName === 'string' && metadataName.trim())
          ? metadataName.trim().slice(0, 80)
          : (user.email?.split('@')[0] || 'RCC Member').slice(0, 80);
        const profileInsert = await fetch(base + '/rest/v1/profiles?on_conflict=user_id', {
          method: 'POST',
          headers: { ...serviceHeaders(env), Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ user_id: user.id, display_name: displayName, discord_id: discordId }),
          signal: AbortSignal.timeout(10000),
        });
        if (!profileInsert.ok) {
          if (profileInsert.status === 409) return reply({ error: 'Esa cuenta de Discord ya está vinculada a otro perfil RCC.' }, 409);
          return reply({ error: 'No se pudo crear el perfil con tu Discord vinculado.' }, 502);
        }
      }

      const isVip = await readMembership(base, env, user.id);
      let roleGranted = false;
      if (isVip) {
        try {
          roleGranted = await grantDiscordRole(env, discordId);
        } catch (error) {
          return reply({ error: error instanceof Error ? error.message : 'Discord no pudo asignar el rol VIP.', discordLinked: true, isVip: true }, 502);
        }
      }
      return reply({ ok: true, discordLinked: true, discordId, isVip, roleGranted });
    }

    const adminEmail = env.RCC_ADMIN_EMAIL?.trim().toLowerCase();
    if (!adminEmail) return reply({ error: 'Falta configurar RCC_ADMIN_EMAIL.' }, 503);
    if (user.email?.toLowerCase() !== adminEmail) return reply({ error: 'No tienes permisos de administrador.' }, 403);

    if (body.action === 'lookup') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const member = await findUserByEmail(base, env, email);
      if (!member) return reply({ error: 'No se encontró una cuenta RCC con ese correo.' }, 404);
      const isVip = await readMembership(base, env, member.id);
      return reply({ user: { id: member.id, email: member.email || email, isVip } });
    }

    if (body.action === 'set') {
      const userId = typeof body.userId === 'string' ? body.userId : '';
      if (!UUID_RE.test(userId) || typeof body.isVip !== 'boolean') return reply({ error: 'Miembro o estado VIP no válido.' }, 400);
      const isVip = body.isVip;
      const response = await fetch(base + '/rest/v1/rcc_vip_memberships?on_conflict=user_id', {
        method: 'POST',
        headers: { ...serviceHeaders(env), Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ user_id: userId, is_vip: isVip, updated_by: user.id, updated_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return reply({ error: 'No se pudo guardar el estado VIP.' }, 502);

      const memberResponse = await fetch(base + '/auth/v1/admin/users/' + encodeURIComponent(userId), {
        headers: serviceHeaders(env),
        signal: AbortSignal.timeout(10000),
      });
      let memberEmail = userId;
      if (memberResponse.ok) {
        const member = await memberResponse.json() as AuthUser;
        memberEmail = member.email || userId;
      }
      const discordNotified = await notifyDiscord(env, memberEmail, isVip, user.email || adminEmail);
      return reply({ ok: true, isVip, discordNotified });
    }

    return reply({ error: 'Acción no reconocida.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/SUPABASE_(ANON_KEY|SERVICE_ROLE_KEY)/.test(message)) return reply({ error: message }, 503);
    return reply({ error: 'No se pudo completar la operación de membresía.' }, 503);
  }
}
