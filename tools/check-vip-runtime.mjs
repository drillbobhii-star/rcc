import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../assets/vip-membership.js', import.meta.url), 'utf8');
const classes = () => {
  const values = new Set();
  return { add: name => values.add(name), remove: name => values.delete(name), contains: name => values.has(name) };
};
const pre = { classList: classes() };
const code = { textContent: '', closest: () => pre };
const copy = { disabled: false, hidden: false, removeAttribute(name) { this[name] = false; } };
const download = { textContent: 'Descargar .lua', disabled: false };
const explain = { textContent: '¿Qué hace este código?', hidden: false };
let gate = null;
const body = { querySelector: () => ({ before: item => { gate = item; } }), append: item => { gate = item; } };
const scriptModal = {
  querySelector: selector => selector === '#scriptCopyBtn' ? copy : gate,
  querySelectorAll: () => [download, explain]
};
const elements = { modalCode: code, modal: scriptModal, modalBody: body, scriptCopyBtn: copy };
const events = {};
let authCallback;
let session = { user: { id: 'confirmed-user' }, access_token: 'test-placeholder' };
let queryCount = 0;
let membership = true;
let pendingQuery;
const client = {
  auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: callback => { authCallback = callback; return { data: {} }; }
  },
  from(table) {
    assert.equal(table, 'rcc_vip_memberships');
    return { select: () => ({ eq: (column, id) => {
      assert.equal(column, 'user_id'); assert.equal(id, session.user.id);
      return { maybeSingle: () => { queryCount++; return pendingQuery || Promise.resolve({ data: { is_vip: membership } }); } };
    } }) };
  }
};
const window = {
  rccSupabaseReady: Promise.resolve(client), openScript() {},
  addEventListener: (event, callback) => { events[event] = callback; }
};
const document = {
  getElementById: id => elements[id] || null, querySelectorAll: () => [],
  addEventListener() {}, body: { style: {} },
  createElement: () => ({ append() {}, remove() { gate = null; } })
};
vm.runInNewContext(source, { window, document, console: { error() {} }, setTimeout,
  fetch: async () => ({ ok: false }) });
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 2)); };
await settle();
assert.equal(window.RCCVIP.isVip, true, 'Checkout failure must not revoke confirmed VIP');
let script;
for (let id = 1; !script; id++) if (window.RCCVIP.isVipScript({ id })) script = { id, code: 'print("VIP")' };
window.openScript(script);
assert.equal(code.textContent, script.code);
membership = false;
await window.RCCVIP.refreshStatus();
assert.equal(copy.hidden, true);
assert.equal(download.disabled, true);
assert.ok(pre.classList.contains('rcc-vip-code-locked'));
membership = true;
const before = queryCount;
authCallback('SIGNED_IN', session);
assert.equal(queryCount, before, 'Auth callback must defer queries outside the auth lock');
await settle();
assert.equal(code.textContent, script.code);
assert.equal(copy.hidden, false);
assert.equal(download.disabled, false);
assert.equal(explain.hidden, false);
assert.equal(gate, null);
assert.equal(pre.classList.contains('rcc-vip-code-locked'), false);
events.focus({ type: 'focus' });
await settle();
assert.equal(window.RCCVIP.isVip, true, 'Browser events must never be treated as sessions');
let resolveQuery;
pendingQuery = new Promise(resolve => { resolveQuery = resolve; });
const staleRefresh = window.RCCVIP.refreshStatus();
await new Promise(resolve => setTimeout(resolve, 2));
session = null;
authCallback('SIGNED_OUT', null);
await settle();
resolveQuery({ data: { is_vip: true } });
await staleRefresh;
assert.equal(window.RCCVIP.isVip, false, 'A late membership response must not unlock a signed-out user');
console.log('VIP runtime checks passed.');
