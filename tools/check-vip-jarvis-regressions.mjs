import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const vipSource = await readFile(new URL('../assets/vip-membership.js', import.meta.url), 'utf8');
function element() {
  const classes = new Set();
  return {
    classList: { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v),
      toggle(v, on) { if (on) classes.add(v); else classes.delete(v); } },
    dataset: {}, disabled: true, hidden: true, textContent: '',
    addEventListener() {}, focus() {}, removeAttribute(key) { this[key] = false; },
    remove() { this.removed = true; }, querySelector() { return null; }, querySelectorAll() { return []; }
  };
}
const pre = element();
pre.classList.add('rcc-vip-code-locked');
const code = element();
code.closest = () => pre;
const copy = element();
const download = element(); download.textContent = 'Descargar';
const explain = element(); explain.textContent = '¿Qué hace este código?';
const gate = element();
const scriptModal = element();
scriptModal.querySelector = selector => ({ '#scriptCopyBtn': copy, '.rcc-vip-modal-gate': gate }[selector] || null);
scriptModal.querySelectorAll = () => [download, explain];
const elements = { modal: scriptModal, modalBody: element(), modalCode: code, scriptCopyBtn: copy };
let session = { user: { id: 'vip-user' } };
let authCallback;
let pendingMembership;
let membershipError = null;
let sessionReads = 0;
const requestedUsers = [];
const events = {};
const client = {
  auth: {
    async getSession() { sessionReads++; return { data: { session } }; },
    onAuthStateChange(callback) { authCallback = callback; return { data: {} }; }
  },
  from(table) {
    assert.equal(table, 'rcc_vip_memberships');
    return { select() { return this; }, eq(key, id) {
      assert.equal(key, 'user_id'); requestedUsers.push(id); return this;
    }, maybeSingle() {
      return pendingMembership || Promise.resolve({ data: { is_vip: true }, error: membershipError });
    } };
  }
};
const window = { rccSupabaseReady: Promise.resolve(client), openScript() {},
  addEventListener(name, callback) { events[name] = callback; } };
const context = vm.createContext({ window, document: {
  getElementById: id => elements[id] || null, querySelectorAll: () => [], addEventListener() {}
}, console: { error() {} }, setTimeout,
fetch() { assert.fail('VIP must not depend on the optional membership API'); } });
vm.runInContext(vipSource, context);
await new Promise(resolve => setImmediate(resolve));
assert.equal(window.RCCVIP.isVip, true);
const vipScript = Array.from({ length: 100 }, (_, id) => ({ id: String(id), code: 'print("VIP")' }))
  .find(script => window.RCCVIP.isVipScript(script));
window.openScript(vipScript);
assert.equal(code.textContent, vipScript.code);
assert.equal(pre.classList.contains('rcc-vip-code-locked'), false);
assert.equal(copy.disabled, false);
assert.equal(copy.hidden, false);
assert.equal(download.disabled, false);
assert.equal(explain.hidden, false);
assert.equal(gate.removed, true);
// DOM focus/session events must cause a session read, never be treated as a Session.
const readsBefore = sessionReads;
await events.focus({ type: 'focus' });
await events['rcc:session']({ type: 'rcc:session' });
await new Promise(resolve => setImmediate(resolve));
assert.ok(sessionReads >= readsBefore + 2);
assert.equal(window.RCCVIP.isVip, true);
// Stale successful queries cannot restore VIP after logout.
let resolveMembership;
pendingMembership = new Promise(resolve => { resolveMembership = resolve; });
const oldRefresh = window.RCCVIP.refreshStatus(session);
await new Promise(resolve => setImmediate(resolve));
// Avoid rendering the locked DOM in this minimal fixture.
elements.modalCode = null;
authCallback('SIGNED_OUT', null);
assert.equal(window.RCCVIP.isVip, false);
await new Promise(resolve => setTimeout(resolve, 10));
resolveMembership({ data: { is_vip: true } });
await oldRefresh;
assert.equal(window.RCCVIP.isVip, false);
pendingMembership = null;
membershipError = new Error('RLS unavailable');
await window.RCCVIP.refreshStatus(session);
assert.equal(window.RCCVIP.isVip, false);
assert.ok(requestedUsers.every(id => id === 'vip-user'));

// Exercise the actual bot action handlers with a mocked Discord API.
const botSource = await readFile(new URL('../discord-admin/src/server.js', import.meta.url), 'utf8');
const requests = [];
const guildId = '123456789012345678';
const channel = { id: '223456789012345678', name: 'pruebas', type: 0 };
const snowflake = date => ((BigInt(date) - 1420070400000n) << 22n).toString();
const recentId = snowflake(Date.now() - 10000);
const oldId = snowflake(Date.now() - 15 * 86400000);
let messages = [{ id: recentId }, { id: oldId }];
const bot = vm.createContext({ process: { env: {} }, Buffer, console, setInterval, clearInterval });
vm.runInContext(botSource.replace(/^import .*;\n/gm, '').split('const server = http.createServer')[0] + `
  discordApi = async (path, options = {}) => mockApi(path, options);
  globalThis.handlers = { executeAction, actionRequiresApproval, actionDescription, startTyping };
`, bot);
bot.mockApi = async (path, options) => {
  requests.push({ path, ...options });
  if (path === `/guilds/${guildId}/channels`) return [channel];
  if (path.includes('/messages?')) return messages;
  if (path === `/channels/${channel.id}`) return { ...channel,
    permission_overwrites: [{ id: guildId, type: 0, allow: '1024', deny: '4096' }] };
  if (path.includes('?with_counts')) return { id: guildId, name: 'RCC', approximate_member_count: 42, premium_subscription_count: 3 };
  if (path.includes('/members/')) return { user: { id: guildId, username: 'Miembro' }, roles: ['rol'], joined_at: '2026-01-01' };
  return null;
};
const { executeAction, actionRequiresApproval, startTyping } = bot.handlers;
for (const count of [0, 101, 1.5, '5']) {
  await assert.rejects(executeAction(guildId, 'purge_messages', { channel_id: channel.id, count }), /entero/);
}
await assert.rejects(executeAction(guildId, 'purge_messages', { channel_id: 'outside', count: 5 }), /servidor autorizado/);
assert.equal(actionRequiresApproval('purge_messages'), true);
await executeAction(guildId, 'purge_messages', { channel_id: channel.id, count: 2 });
assert.ok(requests.some(req => req.method === 'DELETE' && req.path.endsWith('/' + recentId)));
assert.ok(!requests.some(req => req.method === 'DELETE' && req.path.endsWith('/' + oldId)));
messages = [{ id: recentId }, { id: snowflake(Date.now() - 20000) }];
await executeAction(guildId, 'purge_messages', { channel_id: channel.id, count: 2 });
assert.equal(requests.at(-1).path.endsWith('/bulk-delete'), true);
assert.equal(requests.at(-1).body.messages.length, 2);
await executeAction(guildId, 'lock_channel', { channel_id: channel.id });
assert.equal(requests.at(-1).body.allow, '1024');
assert.equal(requests.at(-1).body.deny, String(4096 + 2048));
await executeAction(guildId, 'unlock_channel', { channel_id: channel.id });
assert.equal(requests.at(-1).body.allow, String(1024 + 2048));
assert.equal(requests.at(-1).body.deny, '4096');
const info = await executeAction(guildId, 'server_info', {});
assert.equal(info.miembros, 42); assert.equal(info.boosts, 3); assert.equal(info.canales, 1);
await assert.rejects(executeAction(guildId, 'user_info', { user_id: '../invalid' }), /válido/);
assert.equal((await executeAction(guildId, 'user_info', { user_id: guildId })).nombre, 'Miembro');
const stopTyping = startTyping(channel.id);
assert.ok(requests.at(-1).path.endsWith('/typing'));
stopTyping();
console.log('VIP session/DOM and Jarvis administrative regression checks passed.');
