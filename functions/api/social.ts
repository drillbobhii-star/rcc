type Env = { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string; SUPABASE_SERVICE_ROLE_KEY?: string };
type AuthUser = { id: string; email?: string; created_at?: string; user_metadata?: Record<string, unknown> };
const ADMIN_EMAIL = "drillbobhii@gmail.com";
const PROJECT_URL = "https://cbkrpyfkteomcukdisdw.supabase.co";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
const base = (env: Env) => (env.SUPABASE_URL || PROJECT_URL).replace(/\/+$/, "");
function headers(env: Env) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY.");
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" };
}
async function rest<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(base(env) + "/rest/v1/" + path, { ...init, headers: { ...headers(env), ...(init.headers || {}) }, signal: AbortSignal.timeout(12000) });
  const body = await response.text();
  if (!response.ok) throw new Error("Supabase social API: " + body.slice(0, 500));
  return (body ? JSON.parse(body) : null) as T;
}
async function authUser(request: Request, env: Env): Promise<AuthUser | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !env.SUPABASE_ANON_KEY) return null;
  const response = await fetch(base(env) + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) return null;
  return await response.json() as AuthUser;
}
async function allAuthUsers(env: Env): Promise<AuthUser[]> {
  const users: AuthUser[] = [];
  for (let page = 1; page <= 20; page++) {
    const response = await fetch(base(env) + "/auth/v1/admin/users?page=" + page + "&per_page=1000", { headers: headers(env), signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("No se pudieron consultar las cuentas RCC.");
    const data = await response.json() as { users?: AuthUser[] };
    const batch = data.users || [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
}
async function getSettings(env: Env) {
  const rows = await rest<Array<{ creator_messages_enabled: boolean; profiles_enabled: boolean; follows_enabled: boolean }>>(env, "rcc_social_settings?select=creator_messages_enabled,profiles_enabled,follows_enabled&id=eq.true&limit=1");
  return rows[0] || { creator_messages_enabled: true, profiles_enabled: true, follows_enabled: true };
}
async function publicProfile(env: Env, id: string, profiles: Record<string, any>[], users: AuthUser[], vipIds: Set<string>, viewerId: string | null) {
  const p = profiles.find(row => row.user_id === id);
  const u = users.find(row => row.id === id);
  if (!p || !u || p.public_profile === false || p.is_banned === true) return null;
  const username = String(p.username || "").trim();
  const displayName = String(p.display_name || u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Usuario RCC").slice(0, 80);
  const [followers, following, codes, followed] = await Promise.all([
    rest<Array<{ follower_id: string }>>(env, "rcc_profile_follows?select=follower_id&followed_id=eq." + id),
    rest<Array<{ followed_id: string }>>(env, "rcc_profile_follows?select=followed_id&follower_id=eq." + id),
    rest<Array<{ id: string; title: string; game_name: string; description: string; code_text: string; created_at: string }>>(env, "rcc_profile_codes?select=id,title,game_name,description,code_text,created_at&user_id=eq." + id + "&order=created_at.desc&limit=50"),
    viewerId && viewerId !== id ? rest<Array<{ follower_id: string }>>(env, "rcc_profile_follows?select=follower_id&follower_id=eq." + viewerId + "&followed_id=eq." + id + "&limit=1") : Promise.resolve([]),
  ]);
  return {
    user_id: id, username, display_name: displayName,
    avatar_url: String(p.avatar_url || u.user_metadata?.avatar_url || u.user_metadata?.picture || ""),
    cover_url: String(p.cover_url || ""), bio: String(p.bio || ""),
    is_vip: vipIds.has(id), is_creator: u.email?.trim().toLowerCase() === ADMIN_EMAIL || p.is_creator === true,
    followers_count: followers.length, following_count: following.length,
    is_following: followed.length > 0,
    codes: codes.map(code => ({ id: code.id, title: code.title, game_name: code.game_name, description: code.description, code_text: code.code_text, created_at: code.created_at })),
  };
}
export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (!["GET", "POST"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Origen no permitido." }, 403);
  try {
    const viewer = await authUser(request, env);
    const settings = await getSettings(env);
    if (request.method === "GET") {
      if (!settings.profiles_enabled) return json({ enabled: false, profiles: [] });
      const [users, profiles, memberships] = await Promise.all([
        allAuthUsers(env),
        rest<Record<string, any>[]>(env, "profiles?select=user_id,username,display_name,avatar_url,cover_url,bio,public_profile,is_creator,is_banned&order=display_name.asc&limit=5000"),
        rest<Array<{ user_id: string; is_vip: boolean }>>(env, "rcc_vip_memberships?select=user_id,is_vip&is_vip=eq.true&limit=5000"),
      ]);
      const vipIds = new Set(memberships.map(row => row.user_id));
      const params = new URL(request.url).searchParams;
      const query = (params.get("q") || "").trim().toLowerCase().slice(0, 60);
      const target = params.get("user");
      if (target) {
        const profile = await publicProfile(env, target, profiles, users, vipIds, viewer?.id || null);
        if (!profile) return json({ error: "Este perfil no está disponible." }, 404);
        return json({ enabled: true, settings: { creator_messages_enabled: settings.creator_messages_enabled }, profile });
      }
      const creatorUser = users.find(u => u.email?.trim().toLowerCase() === ADMIN_EMAIL);\n      const creatorProfile = creatorUser ? profiles.find(p => p.user_id === creatorUser.id) : null;\n      const creator = creatorUser && creatorProfile && creatorProfile.public_profile !== false && creatorProfile.is_banned !== true ? { user_id: creatorUser.id, username: String(creatorProfile.username || ""), display_name: String(creatorProfile.display_name || creatorUser.user_metadata?.name || "Drillbobhii"), avatar_url: String(creatorProfile.avatar_url || creatorUser.user_metadata?.avatar_url || creatorUser.user_metadata?.picture || ""), is_vip: vipIds.has(creatorUser.id), is_creator: true } : null;\n      const matches = profiles.filter(p => {
        if (p.public_profile === false || p.is_banned === true) return false;
        const user = users.find(u => u.id === p.user_id);
        if (!user) return false;
        const name = String(p.display_name || user.user_metadata?.name || user.email?.split("@")[0] || "").toLowerCase();
        const username = String(p.username || "").toLowerCase();
        return !query || name.includes(query) || username.includes(query);
      }).slice(0, 40).map(p => {
        const user = users.find(u => u.id === p.user_id)!;
        return { user_id: p.user_id, username: String(p.username || ""), display_name: String(p.display_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuario RCC"), avatar_url: String(p.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || ""), is_vip: vipIds.has(p.user_id), is_creator: user.email?.trim().toLowerCase() === ADMIN_EMAIL || p.is_creator === true };
      });
      return json({ enabled: true, profiles: matches, creator, settings: { creator_messages_enabled: settings.creator_messages_enabled, follows_enabled: settings.follows_enabled } });
    }
    if (!viewer) return json({ error: "Inicia sesión para realizar esta acción." }, 401);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action || "");
    const isCreator = viewer.email?.trim().toLowerCase() === ADMIN_EMAIL;
    if (action === "setCreatorMessages") {
      if (!isCreator || typeof body.enabled !== "boolean") return json({ error: "Solo el creador puede cambiar esta opción." }, 403);
      await rest(env, "rcc_social_settings?id=eq.true", { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ creator_messages_enabled: body.enabled, updated_at: new Date().toISOString(), updated_by: viewer.id }) });
      return json({ ok: true, enabled: body.enabled });
    }
    if (action === "follow" || action === "unfollow") {
      if (!settings.follows_enabled) return json({ error: "El seguimiento está desactivado temporalmente." }, 403);
      const target = String(body.userId || "");
      if (!/^[0-9a-f-]{36}$/i.test(target) || target === viewer.id) return json({ error: "Perfil no válido." }, 400);
      if (action === "follow") {
        await rest(env, "rcc_profile_follows?on_conflict=follower_id,followed_id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ follower_id: viewer.id, followed_id: target }) });
      } else {
        await rest(env, "rcc_profile_follows?follower_id=eq." + viewer.id + "&followed_id=eq." + target, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      }
      return json({ ok: true, following: action === "follow" });
    }
    if (action === "updateProfile") {
      const username = String(body.username || "").trim().toLowerCase();
      const bio = String(body.bio || "").trim().slice(0, 280);
      const cover = String(body.cover_url || "").trim();
      if (username && !/^[a-z0-9_]{3,24}$/.test(username)) return json({ error: "El usuario debe tener 3–24 caracteres: letras, números o guion bajo." }, 400);
      if (cover && (!/^https:\/\//i.test(cover) || cover.length > 1000)) return json({ error: "La portada debe ser una URL HTTPS válida." }, 400);
      await rest(env, "profiles?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: viewer.id, username: username || null, bio, cover_url: cover || null }) });
      return json({ ok: true });
    }
    if (action === "addCode") {
      const title = String(body.title || "").trim().slice(0, 100);
      const game = String(body.game_name || "").trim().slice(0, 100);
      const description = String(body.description || "").trim().slice(0, 500);
      const code = String(body.code_text || "").trim();
      if (!title || !code || code.length > 100000) return json({ error: "Título y código son obligatorios; máximo 100.000 caracteres." }, 400);
      await rest(env, "rcc_profile_codes", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: viewer.id, title, game_name: game, description, code_text: code }) });
      return json({ ok: true });
    }
    return json({ error: "Acción no reconocida." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno del sistema social." }, 500);
  }
}