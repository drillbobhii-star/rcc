type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RCC_WEB_PUSH_PUBLIC_KEY?: string;
  RCC_WEB_PUSH_PRIVATE_KEY?: string;
  RCC_WEB_PUSH_SUBJECT?: string;
};

type Actor = { id: string; email?: string; role: "admin" | "user" };
type PushSubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

const ADMIN_EMAIL = "drillbobhii@gmail.com";
const PROJECT_URL = "https://cbkrpyfkteomcukdisdw.supabase.co";
const MAX_MESSAGE_LENGTH = 5000;
const ACTIVE_WINDOW_MS = 90_000;
const utf8 = new TextEncoder();

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
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en Cloudflare Pages.");
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
  };
}
async function rest<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(baseUrl(env) + "/rest/v1/" + path, {
    ...init,
    headers: { ...serviceHeaders(env), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw Object.assign(new Error("Supabase REST " + response.status + ": " + detail), { status: response.status });
  }
  if (response.status === 204) return null as T;
  return await response.json() as T;
}
async function actorFor(request: Request, env: Env): Promise<Actor | Response> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !env.SUPABASE_ANON_KEY) return json({ error: "Inicia sesión para continuar." }, 401);
  try {
    const response = await fetch(baseUrl(env) + "/auth/v1/user", {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return json({ error: "La sesión no es válida." }, 401);
    const user = await response.json() as { id: string; email?: string };
    return { id: user.id, email: user.email, role: user.email?.trim().toLowerCase() === ADMIN_EMAIL ? "admin" : "user" };
  } catch {
    return json({ error: "No se pudo verificar la sesión." }, 503);
  }
}
async function profileState(env: Env, userId: string) {
  const q = new URLSearchParams({ user_id: "eq." + userId, select: "is_banned", limit: "1" });
  const rows = await rest<Array<{ is_banned: boolean }>>(env, "profiles?" + q.toString());
  return { isBanned: rows[0]?.is_banned === true };
}
async function getOrCreateConversation(env: Env, userId: string) {
  const q = new URLSearchParams({ user_id: "eq." + userId, select: "*", limit: "1" });
  let rows = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_conversations?" + q.toString());
  if (!rows.length) {
    rows = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_conversations?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: userId }),
    });
  }
  if (!rows[0]) throw new Error("No se pudo crear la conversación.");
  return rows[0];
}

async function adminConversationList(env: Env) {
  const [conversations, users, profiles, notes, messages] = await Promise.all([
    rest<Array<Record<string, unknown>>>(env, "rcc_chat_conversations?select=*&order=updated_at.desc"),
    listAuthUsers(env),
    rest<Array<Record<string, unknown>>>(env, "profiles?select=user_id,display_name,avatar_url,discord_id,is_banned"),
    rest<Array<Record<string, unknown>>>(env, "rcc_admin_private_notes?select=user_id,note,updated_at"),
    rest<Array<Record<string, unknown>>>(env, "rcc_chat_messages?select=id,conversation_id,sender_role,content,created_at,read_at&order=created_at.desc&limit=5000"),
  ]);
  const userMap = new Map(users.map(u => [u.id, u]));
  const profileMap = new Map(profiles.map(p => [String(p.user_id), p]));
  const noteMap = new Map(notes.map(n => [String(n.user_id), n]));
  const latestMap = new Map<string, Record<string, unknown>>();
  const unreadMap = new Map<string, number>();
  for (const message of messages) {
    const id = String(message.conversation_id);
    if (!latestMap.has(id)) latestMap.set(id, message);
    if (message.sender_role === "user" && !message.read_at) unreadMap.set(id, (unreadMap.get(id) || 0) + 1);
  }
  const now = Date.now();
  const result = conversations.map(conversation => {
    const userId = String(conversation.user_id);
    const user = userMap.get(userId);
    const profile = profileMap.get(userId);
    const note = noteMap.get(userId);
    const latest = latestMap.get(String(conversation.id));
    const lastMessageAt = String(latest?.created_at || conversation.updated_at || conversation.created_at || "");
    const lastSeen = conversation.last_user_seen_at ? new Date(String(conversation.last_user_seen_at)).getTime() : 0;
    return {
      ...conversation,
      email: user?.email || "",
      name: String(profile?.display_name || user?.user_metadata?.full_name || user?.email || userId),
      avatar_url: String(profile?.avatar_url || user?.user_metadata?.avatar_url || ""),
      is_banned: profile?.is_banned === true,
      discord_id: typeof profile?.discord_id === "string" ? profile.discord_id : null,
      admin_note: String(note?.note || ""),
      last_message_at: lastMessageAt,
      last_message_preview: String(latest?.content || ""),
      last_message_sender: String(latest?.sender_role || ""),
      unread_count: unreadMap.get(String(conversation.id)) || 0,
      is_active: conversation.enabled === true && lastSeen > 0 && now - lastSeen <= ACTIVE_WINDOW_MS,
      last_user_seen_at: conversation.last_user_seen_at || null,
    };
  });
  return result.sort((a, b) => {
    const aTime = new Date(String(a.last_message_at)).getTime() || 0;
    const bTime = new Date(String(b.last_message_at)).getTime() || 0;
    return bTime - aTime;
  });
}
async function getMessages(env: Env, actor: Actor, conversationId: string) {
  const q = new URLSearchParams({ id: "eq." + conversationId, select: "*", limit: "1" });
  const conversations = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_conversations?" + q.toString());
  const conversation = conversations[0];
  if (!conversation) return json({ error: "Conversación no encontrada." }, 404);
  if (actor.role !== "admin" && conversation.user_id !== actor.id) return json({ error: "No tienes acceso a esta conversación." }, 403);
  if (actor.role === "user") {
    const state = await profileState(env, actor.id);
    if (state.isBanned) return json({ isBanned: true, error: "Tu cuenta ha sido restringida." }, 403);
    if (conversation.enabled !== true) return json({ enabled: false, messages: [] });
  }
  const mq = new URLSearchParams({
    conversation_id: "eq." + conversationId,
    select: "id,conversation_id,sender_id,sender_role,content,created_at,read_at",
    order: "created_at.asc",
    limit: "200",
  });
  const messages = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_messages?" + mq.toString());
  const unread = messages.filter(m => m.sender_role !== actor.role && !m.read_at).map(m => String(m.id));
  if (unread.length) {
    const uq = new URLSearchParams({ id: "in.(" + unread.join(",") + ")" });
    await rest(env, "rcc_chat_messages?" + uq.toString(), {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    });
  }
  return json({
    enabled: conversation.enabled === true,
    typing: {
      admin: Number(new Date(String(conversation.admin_typing_until || 0))) > Date.now(),
      user: Number(new Date(String(conversation.user_typing_until || 0))) > Date.now(),
    },
    messages,
  });
}

function fromB64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function toB64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}
async function hkdf(secret: Uint8Array, salt: Uint8Array, info: Uint8Array, lengthBits: number) {
  const key = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info }, key, lengthBits
  ));
}
function vapidJwsSegment(value: unknown) {
  return toB64Url(utf8.encode(JSON.stringify(value)));
}
async function createVapidToken(endpoint: URL, env: Env) {
  const publicKey = env.RCC_WEB_PUSH_PUBLIC_KEY || "";
  const privateKey = env.RCC_WEB_PUSH_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) throw new Error("Faltan RCC_WEB_PUSH_PUBLIC_KEY / RCC_WEB_PUSH_PRIVATE_KEY.");
  const rawPublic = fromB64Url(publicKey);
  const rawPrivate = fromB64Url(privateKey);
  if (rawPublic.length !== 65 || rawPrivate.length !== 32) throw new Error("El par de claves VAPID no tiene el formato P-256 esperado.");
  const jwk = {
    kty: "EC", crv: "P-256",
    x: toB64Url(rawPublic.slice(1, 33)),
    y: toB64Url(rawPublic.slice(33, 65)),
    d: toB64Url(rawPrivate),
    ext: true,
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = vapidJwsSegment({ typ: "JWT", alg: "ES256" });
  const payload = vapidJwsSegment({
    aud: endpoint.origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.RCC_WEB_PUSH_SUBJECT || "mailto:drillbobhii@gmail.com",
  });
  const unsigned = header + "." + payload;
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, utf8.encode(unsigned)
  ));
  return { token: unsigned + "." + toB64Url(signature), publicKey };
}
async function encryptWebPush(payload: unknown, p256dh: string, auth: string) {
  const userPublicRaw = fromB64Url(p256dh);
  const authSecret = fromB64Url(auth);
  if (userPublicRaw.length !== 65 || authSecret.length !== 16) throw new Error("La suscripción Push contiene claves inválidas.");
  const userPublic = await crypto.subtle.importKey("raw", userPublicRaw, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: userPublic }, ephemeral.privateKey, 256));
  const authInfo = concatBytes(utf8.encode("WebPush: info\0"), userPublicRaw, serverPublic);
  const inputKeyMaterial = await hkdf(shared, authSecret, authInfo, 256);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(inputKeyMaterial, salt, utf8.encode("Content-Encoding: aes128gcm\0"), 128);
  const nonce = await hkdf(inputKeyMaterial, salt, utf8.encode("Content-Encoding: nonce\0"), 96);
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const clear = concatBytes(utf8.encode(JSON.stringify(payload)), new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, clear));
  // RFC 8188 aes128gcm body header: salt (16) | rs (4096) | key id length | ephemeral public key.
  const header = concatBytes(salt, new Uint8Array([0, 0, 16, 0, serverPublic.length]), serverPublic);
  return concatBytes(header, cipher);
}
async function sendPush(env: Env, subscription: PushSubscriptionRow, payload: unknown) {
  const endpoint = new URL(subscription.endpoint);
  if (endpoint.protocol !== "https:") throw new Error("Push endpoint debe ser HTTPS.");
  const vapid = await createVapidToken(endpoint, env);
  const body = await encryptWebPush(payload, subscription.p256dh, subscription.auth);
  return await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "vapid t=" + vapid.token + ", k=" + vapid.publicKey,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "90",
      Urgency: "high",
    },
    body,
    signal: AbortSignal.timeout(10000),
  });
}
async function notifyAdminDevices(env: Env, message: string) {
  if (!env.RCC_WEB_PUSH_PUBLIC_KEY || !env.RCC_WEB_PUSH_PRIVATE_KEY) return;
  const subs = await rest<PushSubscriptionRow[]>(env,
    "rcc_chat_push_subscriptions?select=id,user_id,endpoint,p256dh,auth");
  await Promise.all(subs.map(async sub => {
    try {
      const response = await sendPush(env, sub, {
        title: "RCC · Nuevo mensaje",
        body: message.slice(0, 120),
        url: "/admin.html#messages",
        tag: "rcc-chat-" + Date.now(),
      });
      if (response.status === 404 || response.status === 410) {
        await rest(env, "rcc_chat_push_subscriptions?id=eq." + encodeURIComponent(sub.id), {
          method: "DELETE", headers: { Prefer: "return=minimal" },
        });
      } else if (!response.ok) {
        console.warn("[RCC Web Push] El proveedor rechazó la notificación:", response.status);
      }
    } catch (error) {
      console.warn("[RCC Web Push] No se pudo notificar un dispositivo:", error);
    }
  }));
}
async function listAuthUsers(env: Env) {
  const all: Array<{ id: string; email?: string; user_metadata?: Record<string, unknown> }> = [];
  for (let page = 1; page <= 20; page++) {
    const response = await fetch(baseUrl(env) + "/auth/v1/admin/users?page=" + page + "&per_page=1000", {
      headers: serviceHeaders(env), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("No se pudo cargar los usuarios de Auth.");
    const result = await response.json() as { users?: Array<{ id: string; email?: string; user_metadata?: Record<string, unknown> }> };
    const users = result.users || [];
    all.push(...users);
    if (users.length < 1000) break;
  }
  return all;
}
async function saveMessage(env: Env, actor: Actor, conversation: Record<string, unknown>, content: string) {
  if (content.length > MAX_MESSAGE_LENGTH) return json({ error: "El mensaje supera los 5.000 caracteres." }, 413);
  if (!content.trim()) return json({ error: "Escribe un mensaje antes de enviarlo." }, 400);
  const saved = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      conversation_id: conversation.id,
      sender_id: actor.id,
      sender_role: actor.role,
      content: content.trim(),
    }),
  });
  await rest(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(String(conversation.id)), {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ updated_at: new Date().toISOString() }),
  });
  if (actor.role === "user") {
    const userText = String(conversation.email || actor.email || "Un usuario RCC");
    await notifyAdminDevices("Un usuario ha enviado un nuevo mensaje al soporte RCC.");
  }
  return json({ ok: true, message: saved[0] });
}
async function broadcastMessage(env: Env, actor: Actor, content: string) {
  if (content.length > MAX_MESSAGE_LENGTH) return json({ error: "El anuncio supera los 5.000 caracteres." }, 413);
  if (!content.trim()) return json({ error: "Escribe el anuncio antes de enviarlo." }, 400);
  const conversations = await rest<Array<{ id: string; user_id: string }>>(env,
    "rcc_chat_conversations?enabled=eq.true&select=id,user_id&order=updated_at.desc&limit=5000");
  const now = new Date().toISOString();
  let delivered = 0;
  for (let i = 0; i < conversations.length; i += 200) {
    const batch = conversations.slice(i, i + 200);
    const userIds = batch.map(c => c.user_id);
    const profiles = await rest<Array<{ user_id: string; is_banned: boolean }>>(env,
      "profiles?user_id=in.(" + userIds.join(",") + ")&select=user_id,is_banned&limit=300");
    const banned = new Set(profiles.filter(p => p.is_banned).map(p => p.user_id));
    const targets = batch.filter(c => !banned.has(c.user_id));
    if (!targets.length) continue;
    await rest(env, "rcc_chat_messages", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify(targets.map(conversation => ({
        conversation_id: conversation.id,
        sender_id: actor.id,
        sender_role: "admin",
        content: content.trim(),
      }))),
    });
    const ids = targets.map(c => c.id);
    await rest(env, "rcc_chat_conversations?id=in.(" + ids.join(",") + ")", {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ updated_at: now }),
    });
    delivered += targets.length;
  }
  return json({ ok: true, delivered });
}
export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (!["GET", "POST"].includes(request.method)) return new Response(null, { status: 405 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Origen no permitido." }, 403);
  const actor = await actorFor(request, env);
  if (actor instanceof Response) return actor;

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const action = url.searchParams.get("action") || "state";
      if (action === "pushPublicKey") {
        if (actor.role !== "admin") return json({ error: "Acceso exclusivo del Creador." }, 403);
        if (!env.RCC_WEB_PUSH_PUBLIC_KEY) return json({ error: "Falta RCC_WEB_PUSH_PUBLIC_KEY en Cloudflare Pages." }, 503);
        return json({ publicKey: env.RCC_WEB_PUSH_PUBLIC_KEY });
      }
      if (action === "adminList") {
        if (actor.role !== "admin") return json({ error: "Solo el Creador puede abrir estos chats." }, 403);
        return json({ conversations: await adminConversationList(env) });
      }
      if (action === "messages") {
        const id = url.searchParams.get("conversationId") || "";
        if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "conversationId inválido." }, 400);
        return await getMessages(env, actor, id);
      }
      if (actor.role === "admin") return json({ role: "admin", conversations: await adminConversationList(env) });
      const state = await profileState(env, actor.id);
      if (state.isBanned) return json({ role: "user", isBanned: true });
      const q = new URLSearchParams({ user_id: "eq." + actor.id, select: "id,enabled", limit: "1" });
      const rows = await rest<Array<{ id: string; enabled: boolean }>>(env, "rcc_chat_conversations?" + q.toString());
      const conversation = rows[0] || null;
      if (conversation) {
        await rest(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(conversation.id), {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ last_user_seen_at: new Date().toISOString() }),
        });
      }
      return json({ role: "user", isBanned: false, conversation: conversation ? { id: conversation.id, enabled: conversation.enabled === true } : null });
    }

    const length = Number(request.headers.get("content-length") || 0);
    if (length > 16000) return json({ error: "La solicitud supera el límite permitido." }, 413);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action || "");
    const content = typeof body.content === "string" ? body.content : "";
    const note = typeof body.note === "string" ? body.note : "";
    const userId = typeof body.userId === "string" ? body.userId : "";
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "Usuario inválido." }, 400);

    if (action === "savePush") {
      if (actor.role !== "admin") return json({ error: "Acceso exclusivo del Creador." }, 403);
      const subscription = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
      if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) return json({ error: "Suscripción Push inválida." }, 400);
      const endpoint = new URL(subscription.endpoint);
      if (endpoint.protocol !== "https:") return json({ error: "El endpoint Push debe usar HTTPS." }, 400);
      await rest(env, "rcc_chat_push_subscriptions?on_conflict=endpoint", {
        method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          user_id: actor.id,
          endpoint: endpoint.toString(),
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        }),
      });
      return json({ ok: true });
    }
    if (action === "deletePush") {
      if (actor.role !== "admin") return json({ error: "Acceso exclusivo del Creador." }, 403);
      const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
      if (!endpoint) return json({ error: "Endpoint inválido." }, 400);
      await rest(env, "rcc_chat_push_subscriptions?user_id=eq." + encodeURIComponent(actor.id) + "&endpoint=eq." + encodeURIComponent(endpoint), {
        method: "DELETE", headers: { Prefer: "return=minimal" },
      });
      return json({ ok: true });
    }
    if (action === "send") {
      let conversation: Record<string, unknown> | undefined;
      if (actor.role === "admin") {
        const rows = await rest<Array<Record<string, unknown>>>(env,
          "rcc_chat_conversations?id=eq." + encodeURIComponent(conversationId) + "&select=*&limit=1");
        conversation = rows[0];
      } else {
        const banned = await profileState(env, actor.id);
        if (banned.isBanned) return json({ error: "Tu cuenta ha sido restringida." }, 403);
        const rows = await rest<Array<Record<string, unknown>>>(env,
          "rcc_chat_conversations?user_id=eq." + encodeURIComponent(actor.id) + "&select=*&limit=1");
        conversation = rows[0];
        if (conversation?.enabled !== true) return json({ error: "Chat cerrado por el administrador." }, 423);
      }
      if (!conversation) return json({ error: "Conversación no encontrada." }, 404);
      if (actor.role !== "admin" && conversation.user_id !== actor.id) return json({ error: "No tienes acceso a esta conversación." }, 403);
      return await saveMessage(env, actor, conversation, content);
    }
    if (action === "ensureConversation") {
      if (actor.role === "admin") return json({ error: "El administrador no abre conversaciones de usuario desde este flujo." }, 403);
      const banned = await profileState(env, actor.id);
      if (banned.isBanned) return json({ error: "Tu cuenta ha sido restringida." }, 403);
      const conversation = await getOrCreateConversation(env, actor.id);
      if (conversation.enabled !== true) return json({ error: "Chat cerrado por el administrador." }, 423);
      return json({ id: conversation.id, enabled: true });
    }
    if (action === "typing") {
      if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json({ error: "Conversación inválida." }, 400);
      const rows = await rest<Array<Record<string, unknown>>>(env,
        "rcc_chat_conversations?id=eq." + encodeURIComponent(conversationId) + "&select=*&limit=1");
      const conversation = rows[0];
      if (!conversation) return json({ error: "Conversación no encontrada." }, 404);
      if (actor.role === "user") {
        if (conversation.user_id !== actor.id) return json({ error: "No tienes acceso a esta conversación." }, 403);
        const banned = await profileState(env, actor.id);
        if (banned.isBanned || conversation.enabled !== true) return json({ error: "Chat no disponible." }, 403);
      }
      const field = actor.role === "admin" ? "admin_typing_until" : "user_typing_until";
      await rest(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(conversationId), {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ [field]: new Date(Date.now() + 4500).toISOString() }),
      });
      return json({ ok: true });
    }

    if (actor.role !== "admin") return json({ error: "Acceso exclusivo del Creador." }, 403);
    if (action === "broadcast") {
      if (body.confirmed !== true) return json({ error: "Confirma el envío del anuncio." }, 400);
      return await broadcastMessage(env, actor, content);
    }
    if (action === "setEnabled") {
      if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json({ error: "Conversación inválida." }, 400);
      await rest(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(conversationId), {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ enabled: body.enabled === true, updated_at: new Date().toISOString() }),
      });
      return json({ ok: true, enabled: body.enabled === true });
    }
    if (action === "deleteChat") {
      if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json({ error: "Conversación inválida." }, 400);
      await rest(env, "rcc_chat_messages?conversation_id=eq." + encodeURIComponent(conversationId), {
        method: "DELETE", headers: { Prefer: "return=minimal" },
      });
      await rest(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(conversationId), {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ updated_at: new Date().toISOString(), enabled: false }),
      });
      return json({ ok: true });
    }
    if (action === "restrictUser" || action === "unrestrictUser") {
      if (!userId) return json({ error: "Usuario inválido." }, 400);
      const banned = action === "restrictUser";
      const q = new URLSearchParams({ user_id: "eq." + userId, select: "user_id" });
      const updated = await rest<Array<{ user_id: string }>>(env, "profiles?" + q.toString(), {
        method: "PATCH", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ is_banned: banned }),
      });
      if (!updated.length) return json({ error: "El usuario no tiene un perfil RCC." }, 404);
      return json({ ok: true, is_banned: banned });
    }
    if (action === "saveNote") {
      if (!userId || note.length > 10000) return json({ error: "Nota o usuario inválido." }, 400);
      await rest(env, "rcc_admin_private_notes?on_conflict=user_id", {
        method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: userId, note, updated_at: new Date().toISOString() }),
      });
      return json({ ok: true });
    }
    return json({ error: "Acción desconocida." }, 400);
  } catch (error) {
    console.error("[RCC private chat]", error);
    const status = Number((error as { status?: number })?.status || 500);
    return json({ error: status >= 400 && status < 500 ? String((error as Error).message) : "No se pudo completar la operación de soporte. Revisa los logs del servidor." }, status >= 400 && status < 600 ? status : 500);
  }
}
