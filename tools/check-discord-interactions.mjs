import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
const keys = generateKeyPairSync('ed25519');
process.env.DISCORD_PUBLIC_KEY = keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
process.env.DISCORD_APPLICATION_ID = '123456789012345678';
process.env.DISCORD_BOT_TOKEN = 'test-placeholder';
process.env.DISCORD_GUILD_ID = '223456789012345678';
const originalFetch = globalThis.fetch;
const outbound = [];
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith('https://discord.com/')) {
    outbound.push({ url: String(url), options });
    return new Response(null, { status: 204 });
  }
  throw new Error('Unexpected external request');
};
const { default: server } = await import('../netlify/server/index.mjs');
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const endpoint = `http://127.0.0.1:${server.address().port}/interactions`;
async function send(payload, valid = true) {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex');
  return originalFetch(endpoint, { method: 'POST', body, headers: {
    'x-signature-ed25519': valid ? signature : '0'.repeat(128),
    'x-signature-timestamp': timestamp
  } });
}
try {
  assert.equal((await send({ type: 1 }, false)).status, 401);
  assert.deepEqual(await (await send({ type: 1 })).json(), { type: 1 });
  const interaction = {
    type: 2, token: 'test-placeholder', guild_id: process.env.DISCORD_GUILD_ID,
    channel_id: '323456789012345678',
    member: { permissions: '32', user: { id: '423456789012345678' } },
    data: { name: 'rcc', options: [{ type: 1, name: 'unknown' }] }
  };
  assert.deepEqual(await (await send(interaction)).json(), { type: 5, data: { flags: 64 } });
  assert.ok(outbound.some(call => call.url.endsWith('/typing')), 'Typing starts before command processing');
  assert.ok(outbound.some(call => call.url.endsWith('/messages/@original')), 'Deferred reply is completed');
  outbound.length = 0;
  interaction.member.permissions = '0';
  await send(interaction);
  assert.equal(outbound.some(call => call.url.endsWith('/typing')), false, 'Unauthorized callers never reach tools');
  console.log('Discord signature, immediate acknowledgement and typing checks passed.');
} finally {
  globalThis.fetch = originalFetch;
  await new Promise(resolve => server.close(resolve));
}
