import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");
const [migration, api, userWidget, adminWidget, index, adminHtml] = await Promise.all([
  read("supabase/migrations/20261115000400_rcc_private_support_chat.sql"),
  read("functions/api/chat.ts"),
  read("assets/chat-widget.js"),
  read("assets/admin-chat.js"),
  read("index.html"),
  read("admin.html"),
]);

assert.match(migration, /profiles\s+add column if not exists is_banned/i);
assert.match(migration, /trg_rcc_protect_account_ban_flag/);
assert.match(migration, /auth\.role\(\).*service_role/);
assert.match(migration, /create table if not exists public\.rcc_chat_conversations/i);
assert.match(migration, /create table if not exists public\.rcc_chat_messages/i);
assert.match(migration, /create table if not exists public\.rcc_admin_private_notes/i);
assert.match(migration, /revoke all on public\.rcc_admin_private_notes from anon, authenticated/i);
assert.match(migration, /values\s*\(\s*'chat-files',[\s\S]*?false/i);

assert.match(api, /const ADMIN_EMAIL = "drillbobhii@gmail\.com"/);
assert.match(api, /auth\/v1\/user/);
assert.match(api, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(api, /actor\.role !== "admin"/);
assert.match(api, /rcc_admin_private_notes/);
assert.match(api, /action === "restrictUser"/);
assert.match(api, /action === "setEnabled"/);
assert.match(api, /action === "deleteChat"/);
assert.match(api, /MAX_FILE_SIZE = 10 \* 1024 \* 1024/);
assert.match(api, /storage\/v1\/object\/sign\/chat-files/);
assert.match(api, /sender_role: actor\.role/);

assert.match(userWidget, /rccBanOverlay/);
assert.match(userWidget, /Tu cuenta ha sido restringida/);
assert.match(userWidget, /setInterval\(\(\) => \{ void poll\(\); \}, 4000\)/);
assert.match(userWidget, /Mensaje del Creador/);\nassert.match(userWidget, /RCC Mensajes/);\nassert.doesNotMatch(userWidget, /FormData|type:"file"/);
assert.match(adminWidget, /QUICK_REPLIES/);
assert.match(adminWidget, /Restringir|restrictUser/);
assert.match(adminWidget, /saveNote/);\nassert.doesNotMatch(adminWidget, /FormData|type:"file"/);
assert.match(index, /assets\/chat-widget\.js/);
assert.match(adminHtml, /data-tab="messages"/);
assert.match(adminHtml, /assets\/admin-chat\.js/);
assert.doesNotMatch(userWidget + adminWidget + index + adminHtml, /SUPABASE_SERVICE_ROLE_KEY|RCC_VIP_WEBHOOK_SECRET/);

console.log("RCC private support chat static checks passed.");
