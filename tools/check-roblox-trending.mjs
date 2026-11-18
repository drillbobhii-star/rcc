import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [api, ui, styles, html, notifications] = await Promise.all([
  readFile(new URL("../functions/api/roblox-trending.ts", import.meta.url), "utf8"),
  readFile(new URL("../assets/roblox-trends.js", import.meta.url), "utf8"),
  readFile(new URL("../assets/roblox-trends.css", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../assets/floating-notifications.css", import.meta.url), "utf8")
]);

assert.match(api, /explore-api\/v1\/get-sort-content/);
assert.match(api, /top-playing-now/);
assert.match(api, /games\.roblox\.com\/v1\/games/);
assert.match(api, /thumbnails\.roblox\.com\/v1\/games\/icons/);
assert.match(api, /b\.playing\s*-\s*a\.playing\s*\|\|\s*b\.visits\s*-\s*a\.visits/);
assert.match(ui, /\/api\/roblox-trending/);
assert.match(ui, /Ver scripts de /);
assert.match(ui, /RCC todavía no tiene scripts registrados/);
assert.doesNotMatch(ui, /Math\.random|copias estimadas|descargas estimadas/);
assert.match(styles, /\.rcc-trend-game/);
assert.match(html, /assets\/roblox-trends\.js/);
assert.match(html, /id="updatesTab"[^>]*hidden/);
assert.doesNotMatch(html, /id="rcc-maintenance"|rm-hours|rcc-maintenance-end-v2/);
assert.match(notifications, /right:max\(16px/);
assert.match(notifications, /top:max\(16px/);
console.log("Roblox trends UI/API and maintenance-removal checks passed.");
