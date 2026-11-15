import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, client, api, migration] = await Promise.all([
  readFile("admin.html", "utf8"),
  readFile("assets/admin-dashboard.js", "utf8"),
  readFile("functions/api/admin-dashboard.ts", "utf8"),
  readFile("supabase/migrations/20261115000300_admin_profile_flags.sql", "utf8"),
]);

assert.match(html, /assets\/admin-dashboard\.js/);
assert.match(html, /rccAdminSupabaseReady/);
assert.match(html, /id="rccAdminShell" hidden/);
assert.match(client, /drillbobhii@gmail\.com/);
assert.match(client, /window\.location\.replace\("\/index\.html"\)/);
assert.match(client, /setInterval\(\(\) => \{ void loadDashboard\(true\); \}, 30000\)/);
assert.match(client, /user\.email, user\.user_id, user\.discord_id/);
assert.match(client, /approvePayment/);
assert.match(client, /forceRole/);
assert.match(client, /unlinkDiscord/);
assert.doesNotMatch(html + client, /SUPABASE_SERVICE_ROLE_KEY|RCC_VIP_WEBHOOK_SECRET/);
assert.match(api, /const ADMIN_EMAIL = "drillbobhii@gmail\.com"/);
assert.match(api, /user\.email\?\.trim\(\)\.toLowerCase\(\) !== ADMIN_EMAIL/);
assert.match(api, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(api, /rcc_kofi_events/);
assert.match(api, /rcc_vip_memberships/);
assert.match(api, /RCC_VIP_API_URL/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS is_creator boolean/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS has_banner boolean/);

console.log("RCC admin dashboard static checks passed.");
