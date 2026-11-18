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

for (const value of ["https://apis.roblox.com/explore-api/v1", "/get-sorts?", "/get-sort-content", "top-playing-now", "games.roblox.com/v1/games", "thumbnails.roblox.com/v1/games/icons", "https://www.roblox.com/games/", "b.playing - a.playing || b.visits - a.visits"]) assert.ok(api.includes(value), "Missing Roblox API behavior: " + value);
assert.ok(api.includes("Math.ceil(ids.length / 10)") && api.includes("ids.slice(index * 10, index * 10 + 10)"), "Roblox Games API requests must use batches of at most 10 IDs");
for (const value of ["/api/roblox-trending", "game.url", "validUrl", "noopener noreferrer", "studioTab"]) assert.ok(ui.includes(value), "Missing trends UI behavior: " + value);
assert.ok(!ui.includes("openGameScripts") && !ui.includes("Ver scripts de "), "Trend cards must link to Roblox experiences, not RCC script listings");
assert.ok(ui.includes('section("all", { view: "trending" })'), "Opening Tendencias must activate RCC's real trending catalog view");
assert.ok(ui.includes("window.loadTrends?.()"), "Opening Tendencias must load RCC's Lua/script activity ranking");
assert.ok(ui.includes("Keep RCC's own catalog ranking visible"), "Roblox games and RCC Lua resources must remain visible together");
assert.ok(!ui.includes('const hiddenTargets = ["catalogNews", "codeCompare", "activeFilters", "scripts"'), "Tendencias must not hide the RCC scripts catalog");
assert.ok(!ui.includes("Math.random") && !ui.includes("copias estimadas") && !ui.includes("descargas estimadas"), "Trends must not fabricate metrics");
assert.ok(styles.includes(".rcc-trend-game"), "Missing trends card styles");
assert.ok(html.includes("assets/roblox-trends.js"), "Trends script is not loaded");
assert.ok(html.includes('id="updatesTab" type="button" aria-pressed="false" hidden'), "The old Novedades tab should stay removed from navigation");
assert.ok(html.includes('id="studioTab"'), "Roblox Studio category is missing");
assert.ok(html.includes("studioOnly=options.studio===true"), "Roblox Studio filter is not wired");
const loader = await readFile(new URL("../assets/catalog-loader.js", import.meta.url), "utf8");
assert.ok(loader.includes("row.catalog_section='studio'") && loader.includes("verification==='source-imported'"), "Legacy imported Roblox Studio files must be separated from game scripts");
assert.ok(html.includes("s.catalog_section==='games'?0:s.platform==='roblox'?1"), "Main feed ordering is not wired");
assert.ok(!html.includes('id="rcc-maintenance"') && !html.includes("rm-hours") && !html.includes("rcc-maintenance-end-v2"), "Maintenance overlay/timer was not removed");
assert.ok(notifications.includes(".notification-sidebar-section{") && notifications.includes(".notification-sidebar-section .notification-bell{") && !notifications.includes(".floating-notifications{position:fixed"), "Notification bell must be styled as an independent sidebar navigation section, not a floating control");
const notificationUi = await readFile(new URL("../assets/floating-notifications.js", import.meta.url), "utf8");
assert.ok(notificationUi.includes('className = \'sidebar-section notification-sidebar-section\'') && notificationUi.includes("recentSection.insertAdjacentElement('afterend', control)"), "Notifications must be inserted as a standalone sidebar section directly below Recientes");
assert.ok(profileUi.includes("from('rcc_public_profiles')"), "Profile directory must use privacy-safe view");
assert.ok(profileUi.includes("range(suggestionPage*20,suggestionPage*20+19)"), "Profile suggestions must paginate beyond the first 20");
assert.ok(privacyMigration.includes("case when show_roblox then roblox_username else null end"), "Privacy view must mask Roblox usernames when opted out");
assert.ok(privacyMigration.includes("security_invoker = true"), "Privacy view must preserve RLS");
const memberUi = await readFile(new URL("../assets/member-community.js", import.meta.url), "utf8");
assert.ok(memberUi.includes("Mostrar mi usuario de Roblox en mi perfil") && memberUi.includes("Ocultar mi usuario de Roblox"), "Profile editor must offer an explicit Roblox username visibility toggle");
assert.ok(memberUi.includes("https://www.roblox.com/users/") && memberUi.includes("encodeURIComponent(profileData.roblox_id)") && memberUi.includes("profileData.show_roblox && profileData.roblox_username"), "Public profiles must link the opted-in Roblox username to its direct profile");
assert.ok(profileUi.includes("social-person-roblox") && profileUi.includes("https://www.roblox.com/users/"), "Community profile cards must link opted-in Roblox usernames directly");
console.log("RCC Roblox trends, catalog, maintenance and profile privacy checks passed.");
