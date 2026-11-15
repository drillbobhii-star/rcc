import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const [adminHtml, adminChat, userChat, api, dashboardApi, dashboardJs, migration, pushMigration, worker, manifest] = await Promise.all([
  read("admin.html"),
  read("assets/admin-chat.js"),
  read("assets/chat-widget.js"),
  read("functions/api/chat.ts"),
  read("functions/api/admin-dashboard.ts"),
  read("assets/admin-dashboard.js"),
  read("supabase/migrations/20261115000400_rcc_private_support_chat.sql"),
  read("supabase/migrations/20261115000500_rcc_chat_presence_and_push.sql"),
  read("sw.js"),
  read("site.webmanifest"),
]);

assert.match(adminHtml, /id="rccActiveChatsTab"/);
assert.match(adminHtml, /Usuarios Activos/);
assert.match(adminHtml, /id="rccRecentChatsTab"/);
assert.match(adminHtml, /Chats Recientes/);
assert.match(adminHtml, /id="rccChatSearch"/);
assert.match(adminHtml, /id="rccBroadcast"/);
assert.match(adminHtml, /id="rccEnablePush"/);
assert.doesNotMatch(adminHtml, /rccAdminChatFile|rccAdminAttach/);

assert.match(adminChat, /listMode = "recent"/);
assert.match(adminChat, /c\.is_active === true/);
assert.match(adminChat, /rccChatSearch/);
assert.match(adminChat, /action:"broadcast"/);
assert.match(adminChat, /Notification\.requestPermission/);
assert.match(adminChat, /PushManager/);
assert.match(adminChat, /action:"savePush"/);
assert.match(adminChat, /action:"typing"/);
assert.doesNotMatch(adminChat, /FormData|type:"file"|rccAdminChatFile|rccAdminAttach/);

assert.match(userChat, /RCC Mensajes/);
assert.match(userChat, /left:22px/);
assert.match(userChat, /El Creador está escribiendo/);
assert.match(userChat, /action:"typing"/);
assert.doesNotMatch(userChat, /FormData|type:"file"|fileInput|rccChatAttach/);

assert.match(api, /last_user_seen_at/);
assert.match(api, /last_message_at/);
assert.match(api, /ACTIVE_WINDOW_MS = 90_000/);
assert.match(api, /action === "broadcast"/);
assert.match(api, /rcc_chat_push_subscriptions/);
assert.match(api, /RCC_WEB_PUSH_PUBLIC_KEY/);
assert.match(api, /RCC_WEB_PUSH_PRIVATE_KEY/);
assert.match(api, /Authorization: "vapid t="/);
assert.match(api, /Content-Encoding: "aes128gcm"/);
assert.match(api, /action === "savePush"/);
assert.match(api, /action === "pushPublicKey"/);
assert.match(api, /request\.json\(\)/);
assert.doesNotMatch(api, /request\.formData\(\)|createSignedMessage|MAX_FILE_SIZE/);

assert.match(dashboardApi, /Authorization: "Bearer " \+ env\.RCC_VIP_WEBHOOK_SECRET/);
assert.match(dashboardApi, /Solo se puede forzar el rol a miembros con VIP activo/);
assert.match(dashboardJs, /No se puede forzar el rol: esta cuenta no tiene una membresía VIP activa/);

assert.match(migration, /last_user_seen_at timestamptz/);
assert.match(migration, /rcc_chat_push_subscriptions/);
assert.match(migration, /revoke all on public\.rcc_chat_push_subscriptions from anon, authenticated/i);
assert.match(worker, /addEventListener\("push"/);
assert.match(worker, /showNotification/);
assert.match(worker, /notificationclick/);
assert.match(manifest, /"display": "standalone"/);

console.log("RCC chat UX, text-only, broadcast and Web Push static checks passed.");
