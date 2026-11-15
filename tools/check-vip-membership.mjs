import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [index, vip, admin, api, migration, docs] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../assets/vip-membership.js', import.meta.url), 'utf8'),
  readFile(new URL('../admin.html', import.meta.url), 'utf8'),
  readFile(new URL('../functions/api/vip-membership.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261114190000_create_rcc_vip_memberships.sql', import.meta.url), 'utf8'),
  readFile(new URL('../docs/rcc-supporter-setup.md', import.meta.url), 'utf8'),
]);

assert.match(index, /Únete a RCC Supporter por solo \$1\.99 USD \/ mes/);
assert.match(index, /Cancela cuando quieras\. Al suscribirte, desbloqueas más de 5,000 scripts exclusivos, insignia, rol en Discord y cero esperas/);
assert.match(index, /id="vipTab"/);
assert.match(index, /id="rccSupportButton"/);
assert.match(vip, /VIP_PERCENTAGE = 35/);
assert.match(vip, /rcc-vip-code-locked/);
assert.match(admin, /Es VIP/);
assert.match(api, /RCC_ADMIN_EMAIL/);
assert.ok(api.includes("const RCC_KOFI_MONTHLY_URL = env.RCC_KOFI_MONTHLY_URL?.trim() || 'https://ko-fi.com/lubensdrill/tiers';"));
assert.match(api, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(api, /DISCORD_WEBHOOK_URL/);
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all on public\.rcc_vip_memberships from anon, authenticated/i);
assert.match(docs, /RCC_KOFI_MONTHLY_URL/);
assert.ok(docs.includes('https://ko-fi.com/lubensdrill/tiers'));
assert.match(docs, /no una protección fuerte/i);

console.log('RCC Supporter VIP checks passed.');
