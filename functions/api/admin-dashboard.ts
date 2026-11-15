type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RCC_VIP_API_URL?: string;
  RCC_VIP_WEBHOOK_SECRET?: string;
};

type AuthUser = {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
};

const ADMIN_EMAIL = "drillbobhii@gmail.com";
const PROJECT_URL = "https://cbkrpyfkteomcukdisdw.supabase.co";
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const VIP_MINIMUM_USD = 1.99;

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" },
  });
}

function baseUrl(env: Env) {
  return (env.SUPABASE_URL || PROJECT_URL).replace(/\/+$/, "");
}

function serviceHeaders(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno de Pages.");
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
  };
}

async function requireAdmin(request: Request, env: Env): Promise<AuthUser | Response> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Inicia sesión para continuar." }, 401);
  if (!env.SUPABASE_ANON_KEY) return json({ error: "Falta SUPABASE_ANON_KEY en Pages." }, 503);
  try {
    const response = await fetch(baseUrl(env) + "/auth/v1/user", {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return json({ error: "La sesión no es válida." }, 401);
    const user = await response.json() as AuthUser;
    if (user.email?.trim().toLowerCase() !== ADMIN_EMAIL) return json({ error: "Acceso denegado." }, 403);
    return user;
  } catch {
    return json({ error: "No se pudo verificar la sesión de administrador." }, 503);
  }
}

async function rest<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(baseUrl(env) + "/rest/v1/" + path, {
    ...init,
    headers: { ...serviceHeaders(env), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 700);
    throw Object.assign(new Error("Supabase REST " + response.status + ": " + detail), { status: response.status });
  }
  if (response.status === 204) return null as T;
  return await response.json() as T;
}

async function listAuthUsers(env: Env): Promise<AuthUser[]> {
  const result: AuthUser[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(baseUrl(env) + "/auth/v1/admin/users");
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(PAGE_SIZE));
    const response = await fetch(url, {
      headers: serviceHeaders(env),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("No se pudo cargar la lista de usuarios de Supabase Auth.");
    const payload = await response.json() as { users?: AuthUser[] };
    const users = Array.isArray(payload.users) ? payload.users : [];
    result.push(...users);
    if (users.length < PAGE_SIZE) return result;
  }
  return result;
}

async function pagedRest<T>(env: Env, path: string, maxPages = 20): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const response = await fetch(baseUrl(env) + "/rest/v1/" + path, {
      headers: { ...serviceHeaders(env), Range: (page * PAGE_SIZE) + "-" + ((page + 1) * PAGE_SIZE - 1) },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 600);
      throw new Error("No se pudo cargar " + path.split("?")[0] + ": " + detail);
    }
    const batch = await response.json() as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  return rows;
}

function eventView(event: Record<string, unknown>) {
  return {
    message_id: String(event.message_id || ""),
    kofi_transaction_id: event.kofi_transaction_id ? String(event.kofi_transaction_id) : null,
    user_id: event.user_id ? String(event.user_id) : null,
    buyer_email: String(event.buyer_email || ""),
    amount: Number(event.amount || 0),
    currency: String(event.currency || "USD"),
    created_at: String(event.created_at || event.timestamp || event.payment_date || ""),
  };
}

async function grantDiscordRole(env: Env, discordId: string) {
  if (!env.RCC_VIP_API_URL || !env.RCC_VIP_WEBHOOK_SECRET) {
    return { status: "NOT_CONFIGURED", message: "Railway VIP API no está configurada." };
  }
  const endpoint = new URL(env.RCC_VIP_API_URL);
  if (endpoint.protocol !== "https:") throw new Error("RCC_VIP_API_URL debe usar HTTPS.");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.RCC_VIP_WEBHOOK_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ discord_id: discordId }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({})) as { status?: string; invite_url?: string; error?: string };
  if (result.status === "NOT_IN_GUILD") return { status: "NOT_IN_GUILD", inviteUrl: result.invite_url || null };
  if (result.status === "VIP_ROLE_NOT_FOUND") return { status: "VIP_ROLE_NOT_FOUND", message: result.error || "El rol VIP no existe." };
  if (!response.ok) throw new Error(result.error || "Railway rechazó la asignación del rol (HTTP " + response.status + ").");
  return { status: "ROLE_GRANTED" };
}

async function upsertVip(env: Env, userId: string, isVip: boolean, adminId: string) {
  await rest(env, "rcc_vip_memberships?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, is_vip: isVip, updated_by: adminId }),
  });
  // Keep the existing catalog/profile entitlement mirror synchronized too.
  await setProfileFlag(env, userId, "is_supporter", isVip);
}

async function setProfileFlag(env: Env, userId: string, field: string, value: boolean) {
  if (!["is_creator", "has_banner", "is_supporter"].includes(field)) throw new Error("Campo de perfil no permitido.");
  const query = new URLSearchParams({ user_id: "eq." + userId });
  const updated = await rest<Array<{ user_id: string }>>(env, "profiles?" + query.toString(), {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ [field]: value }),
  });
  if (!updated.length) {
    if (field !== "is_supporter") {
      throw new Error("No existe un perfil para actualizar. El usuario debe completar su registro RCC primero.");
    }
    await rest(env, "profiles?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, is_supporter: value }),
    });
  }
}

async function lookupAuthUserByEmail(env: Env, email: string) {
  const users = await listAuthUsers(env);
  return users.find(user => user.email?.trim().toLowerCase() === email.trim().toLowerCase()) || null;
}

async function ensureSupporterProfile(env: Env, user: AuthUser) {
  const query = new URLSearchParams({ user_id: "eq." + user.id, select: "user_id,discord_id" });
  let profiles = await rest<Array<{ user_id: string; discord_id?: string | null }>>(env, "profiles?" + query.toString());
  if (!profiles.length) {
    const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
    const displayName = typeof metaName === "string" && metaName.trim()
      ? metaName.trim().slice(0, 80)
      : (user.email?.split("@")[0] || "RCC Supporter").slice(0, 80);
    profiles = await rest<Array<{ user_id: string; discord_id?: string | null }>>(env, "profiles?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: user.id, display_name: displayName, is_supporter: true }),
    });
  } else {
    await setProfileFlag(env, user.id, "is_supporter", true);
  }
  return profiles[0] || { user_id: user.id, discord_id: null };
}

async function loadDashboard(env: Env) {
  const [authUsers, profiles, memberships, events] = await Promise.all([
    listAuthUsers(env),
    pagedRest<Record<string, unknown>>(env, "profiles?select=*&order=user_id.asc"),
    pagedRest<{ user_id: string; is_vip: boolean }>(env, "rcc_vip_memberships?select=user_id,is_vip&order=user_id.asc"),
    pagedRest<Record<string, unknown>>(env, "rcc_kofi_events?select=*&order=message_id.desc", 5),
  ]);
  const profileMap = new Map(profiles.map(p => [String(p.user_id), p]));
  const vipMap = new Map(memberships.map(m => [m.user_id, m.is_vip === true]));
  const users = authUsers.map(user => {
    const profile = profileMap.get(user.id);
    return {
      user_id: user.id,
      email: user.email || "",
      created_at: user.created_at || "",
      name: String(profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || ""),
      avatar_url: String(profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || ""),
      discord_id: typeof profile?.discord_id === "string" ? profile.discord_id : null,
      is_vip: vipMap.get(user.id) === true,
      is_creator: profile?.is_creator === true,
      has_banner: profile?.has_banner === true,
      is_supporter: profile?.is_supporter === true,
    };
  });
  const userByEmail = new Map(users.map(user => [user.email.toLowerCase(), user]));
  const payments = events.map(event => {
    const item = eventView(event);
    const user = item.user_id ? users.find(candidate => candidate.user_id === item.user_id) : userByEmail.get(item.buyer_email.toLowerCase());
    return { ...item, matched_user_id: user?.user_id || null, matched_discord_id: user?.discord_id || null };
  });
  const totalRevenue = payments.reduce((sum, event) => event.currency === "USD" ? sum + (Number.isFinite(event.amount) ? event.amount : 0) : sum, 0);
  return {
    users,
    payments,
    stats: {
      totalUsers: users.length,
      activeVips: users.filter(user => user.is_vip).length,
      linkedDiscord: users.filter(user => user.discord_id).length,
      usdRevenueShown: Math.round(totalRevenue * 100) / 100,
    },
    capabilities: {
      isCreator: profiles.some(p => Object.prototype.hasOwnProperty.call(p, "is_creator")),
      hasBanner: profiles.some(p => Object.prototype.hasOwnProperty.call(p, "has_banner")),
    },
  };
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (!["GET", "POST"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Origen no permitido." }, 403);
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;
  try {
    if (request.method === "GET") return json(await loadDashboard(env));
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 12000) return json({ error: "Solicitud demasiado grande." }, 413);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action || "");
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "userId inválido." }, 400);

    if (action === "setFlag") {
      const field = String(body.field || "");
      if (typeof body.value !== "boolean" || !userId) return json({ error: "Datos incompletos." }, 400);
      if (field === "is_vip") await upsertVip(env, userId, body.value, auth.id);
      else await setProfileFlag(env, userId, field, body.value);
      return json({ ok: true, field, value: body.value });
    }

    if (action === "approvePayment") {
      const messageId = typeof body.messageId === "string" ? body.messageId : "";
      if (!messageId || messageId.length > 200) return json({ error: "Identificador de pago inválido." }, 400);
      const eventQuery = new URLSearchParams({ message_id: "eq." + messageId, select: "*", limit: "1" });
      const rows = await rest<Record<string, unknown>[]>(env, "rcc_kofi_events?" + eventQuery.toString());
      const event = rows[0];
      if (!event) return json({ error: "No se encontró el pago registrado por Ko-fi." }, 404);
      if (String(event.currency || "").toUpperCase() !== "USD" || Number(event.amount) < VIP_MINIMUM_USD) {
        return json({ error: "El pago no cumple los requisitos de RCC Supporter." }, 422);
      }
      let buyer = typeof event.user_id === "string" && event.user_id
        ? (await listAuthUsers(env)).find(user => user.id === event.user_id) || null
        : null;
      if (!buyer && typeof event.buyer_email === "string") buyer = await lookupAuthUserByEmail(env, event.buyer_email);
      if (!buyer) return json({ error: "El correo del pago todavía no corresponde a un usuario registrado." }, 404);
      const profile = await ensureSupporterProfile(env, buyer);
      await upsertVip(env, buyer.id, true, auth.id);
      if (!event.user_id) {
        const updateEvent = new URLSearchParams({ message_id: "eq." + messageId });
        await rest(env, "rcc_kofi_events?" + updateEvent.toString(), {
          method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: buyer.id }),
        });
      }
      const discordId = typeof profile.discord_id === "string" ? profile.discord_id : "";
      if (!discordId) return json({ ok: true, isVip: true, roleStatus: "DISCORD_NOT_LINKED" });
      const roleStatus = await grantDiscordRole(env, discordId);
      return json({ ok: true, isVip: true, roleStatus });
    }

    if (action === "forceRole") {
      if (!userId) return json({ error: "Selecciona un usuario." }, 400);
      const membershipQuery = new URLSearchParams({ user_id: "eq." + userId, select: "is_vip", limit: "1" });
      const memberships = await rest<Array<{ is_vip: boolean }>>(env, "rcc_vip_memberships?" + membershipQuery.toString());
      if (memberships[0]?.is_vip !== true) return json({ error: "Solo se puede forzar el rol a miembros con VIP activo." }, 409);
      const query = new URLSearchParams({ user_id: "eq." + userId, select: "discord_id", limit: "1" });
      const profiles = await rest<Array<{ discord_id?: string | null }>>(env, "profiles?" + query.toString());
      const discordId = profiles[0]?.discord_id || "";
      if (!discordId) return json({ error: "Este usuario no tiene Discord vinculado." }, 409);
      return json({ ok: true, roleStatus: await grantDiscordRole(env, discordId) });
    }

    if (action === "unlinkDiscord") {
      if (!userId) return json({ error: "Selecciona un usuario." }, 400);
      await rest(env, "profiles?user_id=eq." + encodeURIComponent(userId), {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ discord_id: null }),
      });
      return json({ ok: true });
    }

    return json({ error: "Acción administrativa desconocida." }, 400);
  } catch (error) {
    console.error("[RCC Admin Dashboard]", error);
    const status = Number((error as { status?: number })?.status || 500);
    return json({ error: "No se pudo completar la operación administrativa. Revisa los logs de Pages." }, status >= 400 && status < 600 ? status : 500);
  }
}
