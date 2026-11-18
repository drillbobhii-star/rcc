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
assert.doesNotMatch(client, /approvePayment|forceRole|VIP|is_vip/);
assert.match(client, /forceRole/);
assert.match(client, /unlinkDiscord/);
assert.doesNotMatch(html + client, /SUPABASE_SERVICE_ROLE_KEY|RCC_VIP_WEBHOOK_SECRET/);
assert.match(api, /const ADMIN_EMAIL = "drillbobhii@gmail\.com"/);
assert.match(api, /user\.email\?\.trim\(\)\.toLowerCase\(\) !== ADMIN_EMAIL/);
assert.match(api, /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(api, /rcc_kofi_events|rcc_vip_memberships|RCC_VIP_API_URL|is_supporter/);


assert.match(migration, /ADD COLUMN IF NOT EXISTS is_creator boolean/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS has_banner boolean/);
assert.match(html, /admin-premium\.css/);
assert.match(html, /admin-dashboard\.js\?v=4/);
assert.match(api, /capabilities: \{ isCreator: true, hasBanner: true \}/);
assert.match(api, /\[field\]: value/);
assert.match(client, /renderSwitch\(user, "is_creator", "Creator", !dashboard\.capabilities\.isCreator\)/);
assert.match(client, /renderSwitch\(user, "has_banner", "Banner", !dashboard\.capabilities\.hasBanner\)/);
assert.match(client, /dashboard\.capabilities\.isCreator/);
assert.doesNotMatch(client, /is_creator: \(currentUser\.email/);

console.log("RCC admin dashboard static checks passed.");
