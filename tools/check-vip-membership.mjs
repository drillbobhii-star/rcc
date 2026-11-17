import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [index, vip, admin, api, migration, docs, webhook, successPage, kofiMigration, discordServer] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../assets/vip-membership.js', import.meta.url), 'utf8'),
  readFile(new URL('../admin.html', import.meta.url), 'utf8'),
  readFile(new URL('../functions/api/vip-membership.ts', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261114190000_create_rcc_vip_memberships.sql', import.meta.url), 'utf8'),
  readFile(new URL('../docs/rcc-supporter-setup.md', import.meta.url), 'utf8'),
  readFile(new URL('../functions/api/kofi-webhook.ts', import.meta.url), 'utf8'),
  readFile(new URL('../vip-success.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261115100000_kofi_vip_and_discord_link.sql', import.meta.url), 'utf8'),
  readFile(new URL('../discord-admin/src/server.js', import.meta.url), 'utf8'),
]);

assert.match(index, /Únete a RCC Supporter por solo \$1\.99 USD \/ mes/);
assert.match(index, /Cancela cuando quieras\. Al suscribirte, desbloqueas más de 5,000 scripts exclusivos, insignia, rol en Discord y cero esperas/);
assert.match(index, /id="vipTab"/);
assert.match(index, /id="javaTab"/);
assert.match(index, /id="javaNav"/);
assert.match(index, /id="javaTools"/);
assert.match(index, /id="rccSupportButton"/);
assert.match(vip, /VIP_PERCENTAGE = 45/);
assert.match(vip, /script.platform === 'java'/);
assert.match(vip, /tags.includes\('RCC Supporter'\)/);
assert.match(vip, /rcc-vip-code-locked/);
assert.match(admin, /VIP desde rcc_vip_memberships/);
assert.match(api, /RCC_ADMIN_EMAIL/);
assert.ok(api.includes("const RCC_KOFI_MONTHLY_URL = env.RCC_KOFI_MONTHLY_URL?.trim() || 'https://ko-fi.com/lubensdrill/tiers';"));
assert.match(api, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(api, /DISCORD_WEBHOOK_URL/);
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all on public\.rcc_vip_memberships from anon, authenticated/i);
assert.match(docs, /RCC_KOFI_MONTHLY_URL/);
assert.ok(docs.includes('https://rcc-3m0.pages.dev/vip-success.html'));
assert.match(docs, /no configures ni dependas de una redirección automática/i);
assert.ok(docs.includes('https://ko-fi.com/lubensdrill/tiers'));
assert.match(docs, /no es protección criptográfica/i);

assert.match(webhook, /KOFI_VERIFICATION_TOKEN/);
assert.match(webhook, /findUserByEmail/);
assert.match(webhook, /is_supporter: true/);
assert.match(webhook, /rcc_vip_memberships/);
assert.match(webhook, /message_id/);
assert.match(webhook, /grantDiscordRole/);
assert.match(successPage, /linkIdentity/);
assert.match(successPage, /Esta página se abre desde el enlace que aparece en la descripción del tier o en el mensaje de agradecimiento/);
assert.doesNotMatch(successPage, /document\.referrer/);
assert.match(successPage, /createAccount/);
assert.match(webhook, /pending: true/);
assert.match(api, /pendingQuery/);
assert.match(api, /email_confirmed_at/);
assert.match(successPage, /provider: 'discord'/);
assert.match(successPage, /action: 'linkDiscord'/);
assert.match(api, /body\.action === 'linkDiscord'/);
assert.match(api, /find\(item => item\.provider === 'discord'\)/);
assert.match(api, /profiles/);
assert.match(kofiMigration, /is_supporter boolean/i);
assert.match(kofiMigration, /discord_id text/i);
assert.match(kofiMigration, /rcc_kofi_events/i);
assert.match(discordServer, /req\.url === "\/vip\/grant"/);
assert.match(discordServer, /DISCORD_VIP_ROLE_ID/);
assert.match(docs, /CUALQUIER|cualquier cuenta RCC/i);

console.log('RCC Supporter VIP checks passed.');
