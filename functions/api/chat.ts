type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

type Actor = { id: string; email?: string; role: "admin" | "user" };

const ADMIN_EMAIL = "drillbobhii@gmail.com";
const PROJECT_URL = "https://cbkrpyfkteomcukdisdw.supabase.co";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 5000;
const ALLOWED_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf", "text/plain", "text/csv",
  "application/zip", "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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
async function signedFileUrl(env: Env, path: string) {
  const response = await fetch(baseUrl(env) + "/storage/v1/object/sign/chat-files/" + path.split("/").map(encodeURIComponent).join("/"), {
    method: "POST",
    headers: serviceHeaders(env),
    body: JSON.stringify({ expiresIn: 3600 }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;
  const result = await response.json() as { signedURL?: string };
  if (!result.signedURL) return null;
  return new URL(result.signedURL, baseUrl(env)).toString();
}
async function hydrateMessages(env: Env, messages: Array<Record<string, unknown>>) {
  return await Promise.all(messages.map(async message => ({
    ...message,
    file_url: typeof message.file_path === "string" ? await signedFileUrl(env, message.file_path) : null,
  })));
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
    select: "id,conversation_id,sender_id,sender_role,content,file_path,file_name,file_type,file_size,created_at,read_at",
    order: "created_at.asc",
    limit: "200",
  });
  const messages = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_messages?" + mq.toString());
  const unread = messages.filter(m => m.sender_role !== actor.role && !m.read_at).map(m => String(m.id));
  if (unread.length) {
    const uq = new URLSearchParams({ id: "in.(" + unread.join(",") + ")" });
    await rest(env, "rcc_chat_messages?" + uq.toString(), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    });
  }
  return json({
    enabled: conversation.enabled === true,
    typing: {
      admin: Number(new Date(String(conversation.admin_typing_until || 0))) > Date.now(),
      user: Number(new Date(String(conversation.user_typing_until || 0))) > Date.now(),
    },
    messages: await hydrateMessages(env, messages)
  });
}
async function createSignedMessage(env: Env, actor: Actor, conversation: Record<string, unknown>, content: string, file?: File) {
  if (content.length > MAX_MESSAGE_LENGTH) return json({ error: "El mensaje supera los 5.000 caracteres." }, 413);
  if (!content.trim() && !file) return json({ error: "Escribe un mensaje o adjunta un archivo." }, 400);
  let filePath: string | null = null;
  if (file) {
    if (file.size > MAX_FILE_SIZE) return json({ error: "El archivo supera el límite de 10 MB." }, 413);
    const type = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.has(type)) return json({ error: "Formato no permitido. Usa imágenes, PDF, TXT, CSV, JSON, ZIP o DOCX." }, 415);
    const cleanName = file.name.normalize("NFKC").replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑ]/g, "_").slice(0, 120) || "adjunto";
    filePath = String(conversation.user_id) + "/" + crypto.randomUUID() + "/" + cleanName;
    const upload = await fetch(baseUrl(env) + "/storage/v1/object/chat-files/" + filePath.split("/").map(encodeURIComponent).join("/"), {
      method: "POST",
      headers: { ...serviceHeaders(env), "Content-Type": type, "x-upsert": "false" },
      body: file,
      signal: AbortSignal.timeout(20000),
    });
    if (!upload.ok) {
      const detail = (await upload.text()).slice(0, 350);
      throw new Error("No se pudo guardar el archivo privado: " + detail);
    }
  }
  const message = {
    conversation_id: conversation.id,
    sender_id: actor.id,
    sender_role: actor.role,
    content: content.trim(),
    file_path: filePath,
    file_name: file?.name || null,
    file_type: file?.type || null,
    file_size: file?.size || null,
  };
  const saved = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(message),
  });
  await rest(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(String(conversation.id)), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ updated_at: new Date().toISOString() }),
  });
  return json({ ok: true, message: (await hydrateMessages(env, saved))[0] });
}
async function listAuthUsers(env: Env) {
  const response = await fetch(baseUrl(env) + "/auth/v1/admin/users?page=1&per_page=1000", {
    headers: serviceHeaders(env), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("No se pudo cargar los usuarios de Auth.");
  const result = await response.json() as { users?: Array<{ id: string; email?: string; user_metadata?: Record<string, unknown> }> };
  return result.users || [];
}
async function adminConversationList(env: Env) {
  const [conversations, users, profiles, notes] = await Promise.all([
    rest<Array<Record<string, unknown>>>(env, "rcc_chat_conversations?select=*&order=updated_at.desc"),
    listAuthUsers(env),
    rest<Array<Record<string, unknown>>>(env, "profiles?select=user_id,display_name,avatar_url,discord_id,is_banned"),
    rest<Array<Record<string, unknown>>>(env, "rcc_admin_private_notes?select=user_id,note,updated_at"),
  ]);
  const userMap = new Map(users.map(u => [u.id, u]));
  const profileMap = new Map(profiles.map(p => [String(p.user_id), p]));
  const noteMap = new Map(notes.map(n => [String(n.user_id), n]));
  return conversations.map(conversation => {
    const userId = String(conversation.user_id);
    const user = userMap.get(userId);
    const profile = profileMap.get(userId);
    const note = noteMap.get(userId);
    return {
      ...conversation,
      email: user?.email || "",
      name: String(profile?.display_name || user?.user_metadata?.full_name || user?.email || userId),
      avatar_url: String(profile?.avatar_url || user?.user_metadata?.avatar_url || ""),
      is_banned: profile?.is_banned === true,
      discord_id: typeof profile?.discord_id === "string" ? profile.discord_id : null,
      admin_note: String(note?.note || ""),
    };
  });
}
async function readForm(request: Request) {
  const form = await request.formData();
  const rawFile = form.get("file");
  return {
    action: String(form.get("action") || ""),
    conversationId: String(form.get("conversationId") || ""),
    content: String(form.get("content") || ""),
    note: String(form.get("note") || ""),
    enabled: String(form.get("enabled") || "") === "true",
    userId: String(form.get("userId") || ""),
    file: rawFile instanceof File && rawFile.size ? rawFile : undefined,
  };
}
export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (!["GET", "POST"].includes(request.method)) return new Response(null, { status: 405 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Origen no permitido." }, 403);
  const actor = await actorFor(request, env);
  if (actor instanceof Response) return actor;
  if (request.method === "POST") {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_FILE_SIZE + 512 * 1024) return json({ error: "La solicitud supera el límite de 10 MB." }, 413);
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const action = url.searchParams.get("action") || "state";
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
      return json({ role: "user", isBanned: false, conversation: conversation ? { id: conversation.id, enabled: conversation.enabled === true } : null });
    }

    const form = await readForm(request);
    const { action, content, file, note, userId, conversationId } = form;

    if (action === "ensureConversation") {
      if (actor.role === "admin") return json({ error: "El administrador no abre conversaciones de usuario desde este flujo." }, 403);
      const state = await profileState(env, actor.id);
      if (state.isBanned) return json({ error: "Tu cuenta ha sido restringida." }, 403);
      const conversation = await getOrCreateConversation(env, actor.id);
      if (conversation.enabled !== true) return json({ error: "Chat cerrado por el administrador." }, 423);
      return json({ id: conversation.id, enabled: true });
    }

    if (action === "send") {
      let conversation: Record<string, unknown> | undefined;
      if (actor.role === "admin") {
        const id = conversationId;
        const rows = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(id) + "&select=*&limit=1");
        conversation = rows[0];
      } else {
        const banned = await profileState(env, actor.id);
        if (banned.isBanned) return json({ error: "Tu cuenta ha sido restringida." }, 403);
        const rows = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_conversations?user_id=eq." + encodeURIComponent(actor.id) + "&select=*&limit=1");
        conversation = rows[0];
        if (conversation?.enabled !== true) return json({ error: "Chat cerrado por el administrador." }, 423);
      }
      if (!conversation) return json({ error: "Conversación no encontrada." }, 404);
      return await createSignedMessage(env, actor, conversation, content, file);
    }

    if (action === "typing") {
      if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json({ error: "Conversación inválida." }, 400);
      const rows = await rest<Array<Record<string, unknown>>>(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(conversationId) + "&select=*&limit=1");
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

    if (action === "setEnabled") {
      if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json({ error: "Conversación inválida." }, 400);
      await rest(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(conversationId), {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ enabled: form.enabled, updated_at: new Date().toISOString() }),
      });
      return json({ ok: true, enabled: form.enabled });
    }
    if (action === "deleteChat") {
      if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json({ error: "Conversación inválida." }, 400);
      const fileRows = await rest<Array<{ file_path?: string }>>(env, "rcc_chat_messages?conversation_id=eq." + encodeURIComponent(conversationId) + "&select=file_path");
      for (const file of fileRows) {
        if (!file.file_path) continue;
        try {
          await fetch(baseUrl(env) + "/storage/v1/object/chat-files/" + file.file_path.split("/").map(encodeURIComponent).join("/"), {
            method: "DELETE", headers: serviceHeaders(env), signal: AbortSignal.timeout(10000)
          });
        } catch (error) { console.warn("[RCC chat] No se pudo eliminar un adjunto antiguo:", error); }
      }
      await rest(env, "rcc_chat_messages?conversation_id=eq." + encodeURIComponent(conversationId), { method: "DELETE", headers: { Prefer: "return=minimal" } });
      await rest(env, "rcc_chat_conversations?id=eq." + encodeURIComponent(conversationId), {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ updated_at: new Date().toISOString(), enabled: false }),
      });
      return json({ ok: true });
    }
    if (action === "restrictUser" || action === "unrestrictUser") {
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "Usuario inválido." }, 400);
      const banned = action === "restrictUser";
      const q = new URLSearchParams({ user_id: "eq." + userId, select: "user_id" });
      const updated = await rest<Array<{ user_id: string }>>(env, "profiles?" + q.toString(), {
        method: "PATCH", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ is_banned: banned }),
      });
      if (!updated.length) return json({ error: "El usuario no tiene un perfil RCC. No se aplicó la restricción." }, 404);
      return json({ ok: true, is_banned: banned });
    }
    if (action === "saveNote") {
      if (!/^[0-9a-f-]{36}$/i.test(userId) || note.length > 10000) return json({ error: "Nota o usuario inválido." }, 400);
      await rest(env, "rcc_admin_private_notes?on_conflict=user_id", {
        method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: userId, note }),
      });
      return json({ ok: true });
    }
    if (action === "typing") {
      const id = conversationId;
      const q = new URLSearchParams({ id: "eq." + id });
      await rest(env, "rcc_chat_conversations?" + q.toString(), {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ [actor.role === "admin" ? "admin_typing_until" : "user_typing_until"]: new Date(Date.now() + 5000).toISOString() }),
      });
      return json({ ok: true });
    }
    return json({ error: "Acción desconocida." }, 400);
  } catch (error) {
    console.error("[RCC private chat]", error);
    return json({ error: "No se pudo completar la operación de soporte. Revisa los logs del servidor." }, 500);
  }
}
