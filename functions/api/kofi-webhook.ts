type Env = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  KOFI_VERIFICATION_TOKEN?: string;
  RCC_VIP_API_URL?: string;
  RCC_VIP_WEBHOOK_SECRET?: string;
};

type KofiPayload = {
  verification_token?: string;
  message_id?: string;
  kofi_transaction_id?: string;
  type?: string;
  email?: string;
  amount?: string | number;
  currency?: string;
  is_subscription_payment?: boolean;
};

type AuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

const PROJECT_URL = 'https://cbkrpyfkteomcukdisdw.supabase.co';
const MINIMUM_USD_AMOUNT = 1.99;

function reply(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function serviceHeaders(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada.');
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  };
}

function safeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function parseKofiPayload(request: Request): Promise<KofiPayload> {
  const raw = await request.text();
  if (raw.length > 32_000) throw new Error('El evento de Ko-fi supera el tamaño permitido.');
  const form = new URLSearchParams(raw);
  const encoded = form.get('data');
  const parsed = encoded ? JSON.parse(encoded) : JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('El evento de Ko-fi no tiene un formato válido.');
  }
  return parsed as KofiPayload;
}

async function findUserByEmail(base: string, env: Env, email: string): Promise<AuthUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) return null;

  for (let page = 1; page <= 20; page++) {
    const url = new URL(base + '/auth/v1/admin/users');
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '1000');
    const response = await fetch(url, {
      headers: serviceHeaders(env),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Supabase no pudo buscar la cuenta del comprador.');
    const payload = await response.json() as { users?: AuthUser[] };
    const users = Array.isArray(payload.users) ? payload.users : [];
    const match = users.find(user => user.email?.trim().toLowerCase() === normalized);
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

async function alreadyProcessed(base: string, env: Env, messageId: string) {
  const url = new URL(base + '/rest/v1/rcc_kofi_events');
  url.searchParams.set('message_id', 'eq.' + messageId);
  url.searchParams.set('select', 'message_id');
  url.searchParams.set('limit', '1');
  const response = await fetch(url, { headers: serviceHeaders(env), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('No se pudo comprobar si el evento de Ko-fi ya fue procesado.');
  const rows = await response.json() as Array<{ message_id: string }>;
  return rows.length > 0;
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  if (!env.KOFI_VERIFICATION_TOKEN) return reply({ error: 'Falta configurar KOFI_VERIFICATION_TOKEN.' }, 503);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return reply({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY.' }, 503);

  const base = (env.SUPABASE_URL || PROJECT_URL).replace(/\/+$/, '');
  try {
    const payload = await parseKofiPayload(request);
    if (typeof payload.verification_token !== 'string' ||
        !safeEqual(payload.verification_token, env.KOFI_VERIFICATION_TOKEN)) {
      return reply({ error: 'Token de verificación de Ko-fi incorrecto.' }, 401);
    }

    const isSubscription = payload.type?.toLowerCase() === 'subscription' || payload.is_subscription_payment === true;
    const amount = Number(payload.amount);
    const currency = String(payload.currency || '').toUpperCase();
    if (!isSubscription || !Number.isFinite(amount) || amount < MINIMUM_USD_AMOUNT || currency !== 'USD') {
      return reply({ ok: true, ignored: true, reason: 'El evento no corresponde a una suscripción RCC Supporter de al menos USD 1.99.' });
    }

    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const messageId = String(payload.message_id || payload.kofi_transaction_id || '').trim();
    const transactionId = String(payload.kofi_transaction_id || '').trim();
    if (!email || !messageId || messageId.length > 200) {
      return reply({ error: 'Ko-fi no envió el correo o identificador del pago.' }, 400);
    }

    if (await alreadyProcessed(base, env, messageId)) {
      return reply({ ok: true, duplicate: true });
    }

    // profiles stores user_id, not email. Resolve the verified Supabase Auth email first,
    // then update that user's profile; this works for every buyer, not only the creator.
    const buyer = await findUserByEmail(base, env, email);
    if (!buyer || !buyer.email_confirmed_at) {
      // Keep a verified payment pending so a buyer can create/verify their RCC account
      // later with the same email and claim it from vip-success.html.
      const pendingResponse = await fetch(base + '/rest/v1/rcc_kofi_events', {
        method: 'POST',
        headers: { ...serviceHeaders(env), Prefer: 'return=minimal' },
        body: JSON.stringify({
          message_id: messageId,
          kofi_transaction_id: transactionId || null,
          user_id: buyer?.id || null,
          buyer_email: email,
          amount,
          currency,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!pendingResponse.ok && pendingResponse.status !== 409) {
        throw new Error('No se pudo guardar el pago pendiente de Ko-fi.');
      }
      return reply({
        ok: true,
        matched: false,
        pending: true,
        email,
        message: 'Pago verificado y guardado. El comprador podrá reclamarlo al crear o verificar su cuenta RCC con este mismo correo.',
      });
    }

    const metadataName = buyer.user_metadata?.full_name || buyer.user_metadata?.name;
    const displayName = (typeof metadataName === 'string' && metadataName.trim())
      ? metadataName.trim().slice(0, 80)
      : (email.split('@')[0] || 'RCC Supporter').slice(0, 80);

    const profileUrl = new URL(base + '/rest/v1/profiles');
    profileUrl.searchParams.set('user_id', 'eq.' + buyer.id);
    const profileResponse = await fetch(profileUrl, {
      method: 'PATCH',
      headers: { ...serviceHeaders(env), Prefer: 'return=representation' },
      body: JSON.stringify({ is_supporter: true }),
      signal: AbortSignal.timeout(12000),
    });
    if (!profileResponse.ok) throw new Error('No se pudo activar is_supporter en el perfil RCC.');
    let profiles = await profileResponse.json() as Array<{ discord_id?: string | null }>;
    if (profiles.length === 0) {
      const createProfile = await fetch(base + '/rest/v1/profiles?on_conflict=user_id', {
        method: 'POST',
        headers: { ...serviceHeaders(env), Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ user_id: buyer.id, display_name: displayName, is_supporter: true }),
        signal: AbortSignal.timeout(12000),
      });
      if (!createProfile.ok) throw new Error('No se pudo crear el perfil RCC del comprador.');
      profiles = await createProfile.json() as Array<{ discord_id?: string | null }>;
    }
    const discordId = profiles[0]?.discord_id?.trim() || '';

    const membershipUrl = new URL(base + '/rest/v1/rcc_vip_memberships');
    membershipUrl.searchParams.set('on_conflict', 'user_id');
    const membershipResponse = await fetch(membershipUrl, {
      method: 'POST',
      headers: { ...serviceHeaders(env), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: buyer.id, is_vip: true, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(12000),
    });
    if (!membershipResponse.ok) throw new Error('No se pudo activar la membresía VIP de RCC.');

    const roleGranted = discordId ? await grantDiscordRole(env, discordId) : false;

    const eventResponse = await fetch(base + '/rest/v1/rcc_kofi_events', {
      method: 'POST',
      headers: { ...serviceHeaders(env), Prefer: 'return=minimal' },
      body: JSON.stringify({
        message_id: messageId,
        kofi_transaction_id: transactionId || null,
        user_id: buyer.id,
        buyer_email: email,
        amount,
        currency,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!eventResponse.ok && eventResponse.status !== 409) {
      throw new Error('No se pudo registrar el evento procesado de Ko-fi.');
    }

    return reply({
      ok: true,
      matched: true,
      isSupporter: true,
      discordLinked: Boolean(discordId),
      discordRoleGranted: roleGranted,
    });
  } catch (error) {
    console.error('Ko-fi webhook error:', error);
    return reply({ error: error instanceof Error ? error.message : 'No se pudo procesar el pago.' }, 503);
  }
}
