import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/send-error.ts';
const handler = request => onRequest({ request, env: {} });
const endpoint = 'https://rcc.example/api/send-error';
function request(values = {}, file) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ subject: 'El código no carga', message: 'Al abrir la ficha aparece un error y no carga el código.', category: 'error', mode: 'error', ...values })) data.set(key, value);
  if (file) data.set('screenshot', file);
  return new Request(endpoint, { method: 'POST', headers: { origin: 'https://rcc.example' }, body: data });
}
assert.equal((await handler(new Request(endpoint))).status, 405);
assert.equal((await handler(new Request(endpoint, { method: 'POST' }))).status, 403);
assert.equal((await handler(request({ message: 'corto' }))).status, 400);
assert.equal((await handler(request({ 'bot-field': 'spam' }))).status, 400);
assert.equal((await handler(request({}, new File(['not an image'], 'fake.png', { type: 'image/png' })))).status, 400);
assert.equal((await handler(request())).status, 503);
const originalFetch = globalThis.fetch;
let sent;
try {
  globalThis.fetch = async (_url, options) => {
    sent = options.body;
    return new Response('{}', { status: 200 });
  };
  // Synthetic Discord-format URL; no real webhook is used by these tests.
  const env = { DISCORD_WEBHOOK_URL: ['https://discord.com/api/webhooks', '0', 'test-placeholder'].join('/') };
  const png = new File([new Uint8Array([137,80,78,71,13,10,26,10])], 'screen.png', { type: 'image/png' });
  const result = await onRequest({ request: request({ message: 'Descripción extensa '.repeat(250), email: 'private@example.invalid' }, png), env });
  assert.equal(result.status, 200);
  const payload = JSON.parse(sent.get('payload_json'));
  assert.ok(!JSON.stringify(payload).includes('private@example.invalid'));
  assert.deepEqual(payload.allowed_mentions.parse, []);
  assert.equal(payload.embeds[0].image.url, 'attachment://captura.png');
  assert.ok(sent.get('files[0]') instanceof File);
  assert.ok(sent.get('files[1]') instanceof File);
  assert.ok(JSON.stringify(payload).length < 6000);
  assert.equal((await onRequest({ request: request({ mode: 'support' }), env })).status, 200);
  assert.match(JSON.parse(sent.get('payload_json')).embeds[0].title, /^Soporte/);
  globalThis.fetch = async () => new Response('{}', { status: 429 });
  assert.equal((await onRequest({ request: request(), env })).status, 502);
  globalThis.fetch = async () => { throw new Error('Offline'); };
  assert.equal((await onRequest({ request: request(), env })).status, 503);
} finally { globalThis.fetch = originalFetch; }
console.log('Cloudflare support/report tests passed: validation, attachments, privacy, both modes, Discord failures.');
