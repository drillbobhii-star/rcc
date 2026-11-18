import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [api, ui, styles, html, notifications, profileUi, privacyMigration] = await Promise.all([
  readFile(new URL("../functions/api/roblox-trending.ts", import.meta.url), "utf8"),
  readFile(new URL("../assets/roblox-trends.js", import.meta.url), "utf8"),
  readFile(new URL("../assets/roblox-trends.css", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../assets/floating-notifications.css", import.meta.url), "utf8"),
  readFile(new URL("../assets/profile-discovery.js", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261118150000_secure_public_profile_directory.sql", import.meta.url), "utf8")
]);

for (const value of ["https://apis.roblox.com/explore-api/v1", "/get-sorts?", "/get-sort-content", "top-playing-now", "games.roblox.com/v1/games", "thumbnails.roblox.com/v1/games/icons", "b.playing - a.playing || b.visits - a.visits"]) assert.ok(api.includes(value), "Missing Roblox API behavior: " + value);
for (const value of ["/api/roblox-trending", "Ver scripts de ", "RCC todavía no tiene scripts registrados", "studioTab"]) assert.ok(ui.includes(value), "Missing trends UI behavior: " + value);
assert.ok(!ui.includes("Math.random") && !ui.includes("copias estimadas") && !ui.includes("descargas estimadas"), "Trends must not fabricate metrics");
assert.ok(styles.includes(".rcc-trend-game"), "Missing trends card styles");
assert.ok(html.includes("assets/roblox-trends.js"), "Trends script is not loaded");
assert.ok(html.includes('id="updatesTab" type="button" aria-pressed="false" hidden'), "The old Novedades tab should stay removed from navigation");
assert.ok(html.includes('id="studioTab"'), "Roblox Studio category is missing");
assert.ok(html.includes("studioOnly=options.studio===true"), "Roblox Studio filter is not wired");
assert.ok(html.includes("s.catalog_section==='games'?0:s.platform==='roblox'?1"), "Main feed ordering is not wired");
assert.ok(!html.includes('id="rcc-maintenance"') && !html.includes("rm-hours") && !html.includes("rcc-maintenance-end-v2"), "Maintenance overlay/timer was not removed");
assert.ok(notifications.includes("right:max(16px") && notifications.includes("top:max(16px"), "Notification bell must be top-right");
assert.ok(profileUi.includes("from('rcc_public_profiles')"), "Profile directory must use privacy-safe view");
assert.ok(profileUi.includes("range(suggestionPage*20,suggestionPage*20+19)"), "Profile suggestions must paginate beyond the first 20");
assert.ok(profileUi.includes("range(page*48,page*48+47)"), "Profile directory pagination must not overlap records");
assert.ok(profileUi.includes("range(quickPage*8,quickPage*8+7)"), "Quick profile suggestions must not overlap records");
assert.ok(privacyMigration.includes("case when show_roblox then roblox_username else null end"), "Privacy view must mask Roblox usernames when opted out");
assert.ok(privacyMigration.includes("security_invoker = true"), "Privacy view must preserve RLS");
console.log("RCC Roblox trends, catalog, maintenance and profile privacy checks passed.");
