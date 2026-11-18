import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const [adminHtml, adminChat, userChat, api, dashboardApi, dashboardJs, migration, pushMigration, globalMigration, worker, manifest, sharedPush] = await Promise.all([
  read("admin.html"),
  read("assets/admin-chat.js"),
  read("assets/chat-widget.js"),
  read("functions/api/chat.ts"),
  read("functions/api/admin-dashboard.ts"),
  read("assets/admin-dashboard.js"),
  read("supabase/migrations/20261115000400_rcc_private_support_chat.sql"),
  read("supabase/migrations/20261115000500_rcc_chat_presence_and_push.sql"),
  read("supabase/migrations/20261115000600_rcc_global_chat_and_notifications.sql"),
  read("sw.js"),
  read("site.webmanifest"),
  read("functions/_shared/rcc-web-push.ts"),
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
assert(api.includes('"Content-Encoding": "aes128gcm"'));
assert.match(api, /action === "savePush"/);
assert.match(api, /action === "pushPublicKey"/);
assert.match(api, /request\.json\(\)/);
assert.doesNotMatch(api, /request\.formData\(\)|createSignedMessage|MAX_FILE_SIZE/);

assert.match(dashboardApi, /async function requireAdmin/);
assert.match(dashboardApi, /Acceso denegado/);
assert.match(dashboardJs, /setFlag/);

assert.match(migration, /last_user_seen_at timestamptz/);
assert.match(pushMigration, /add column if not exists last_user_seen_at timestamptz/i);
assert.match(pushMigration, /create table if not exists public\.rcc_chat_push_subscriptions/i);
assert.match(pushMigration, /revoke all on public\.rcc_chat_push_subscriptions from anon, authenticated/i);
assert.match(migration, /rcc_chat_push_subscriptions/);
assert.match(migration, /revoke all on public\.rcc_chat_push_subscriptions from anon, authenticated/i);
assert.match(worker, /addEventListener\("push"/);
assert.match(worker, /showNotification/);
assert.match(worker, /notificationclick/);
assert.match(manifest, /"display": "standalone"/);


assert.match(adminHtml, /rccGlobalChatDisable/);
assert.match(adminHtml, /rccGlobalChatEnable/);
assert.match(adminHtml, /rccMainMessagePreviewBody/);
assert.match(adminHtml, /userSort/);
assert.match(adminHtml, /userFilter/);
assert.match(adminChat, /setGlobalChat/);
assert.match(userChat, /enableUserPush/);
assert.match(userChat, /rccGlobalChatOverlay/);
assert.match(api, /notifyDevices/);
assert.match(api, /audience: actor.role/);
assert.match(api, /setGlobalChat/);
assert.match(globalMigration, /rcc_chat_settings/);
assert.match(globalMigration, /audience/);
assert.match(sharedPush, /sendRccWebPush/);
console.log("RCC chat UX, broadcast, global pause and audience Push static checks passed.");

