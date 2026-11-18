type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
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


async function setProfileFlag(env: Env, userId: string, field: string, value: boolean) {
  if (!["is_creator", "has_banner"].includes(field)) throw new Error("Campo de perfil no permitido.");
  const query = new URLSearchParams({ user_id: "eq." + userId });
  const updated = await rest<Array<{ user_id: string }>>(env, "profiles?" + query.toString(), {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ [field]: value }),
  });
  if (!updated.length) {
    // Create profiles lazily for Auth users who have not completed their first visit.
    // Only the requested entitlement is written; other profile flags stay untouched.
    const authResponse = await fetch(baseUrl(env) + "/auth/v1/admin/users/" + encodeURIComponent(userId), {
      headers: serviceHeaders(env),
      signal: AbortSignal.timeout(10000),
    });
    if (!authResponse.ok) throw new Error("No se pudo recuperar el usuario para crear su perfil RCC.");
    const authUser = await authResponse.json() as AuthUser;
    const metadataName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
    const displayName = typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim().slice(0, 80)
      : (authUser.email?.split("@")[0] || "RCC Member").slice(0, 80);
    await rest(env, "profiles?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, display_name: displayName, [field]: value }),
    });
  }
}


async function loadDashboard(env: Env) {
  const [authUsers, profiles] = await Promise.all([
    listAuthUsers(env),
    pagedRest<Record<string, unknown>>(env, "profiles?select=*&order=user_id.asc"),
  ]);
  const profileMap = new Map(profiles.map(profile => [String(profile.user_id), profile]));
  const users = authUsers.map(user => {
    const profile = profileMap.get(user.id);
    return {
      user_id: user.id,
      email: user.email || "",
      created_at: user.created_at || "",
      name: String(profile?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || ""),
      avatar_url: String(profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || ""),
      discord_id: typeof profile?.discord_id === "string" ? profile.discord_id : null,
      is_creator: profile?.is_creator === true,
      has_banner: profile?.has_banner === true,
      is_banned: profile?.is_banned === true,
    };
  });
  return {
    users,
    stats: { totalUsers: users.length, linkedDiscord: users.filter(user => user.discord_id).length },
    capabilities: { isCreator: true, hasBanner: true },
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
      await setProfileFlag(env, userId, field, body.value);
      return json({ ok: true, field, value: body.value });
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
