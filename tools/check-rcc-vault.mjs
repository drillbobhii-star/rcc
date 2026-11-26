import test from 'node:test';
import assert from 'node:assert/strict';
import { createVaultManager, sha256, validatePendingSource, validateScript } from './rcc-vault.mjs';

function mockResponse(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return status === 204 ? '' : JSON.stringify(body); }
  };
}

test('pending source stores metadata only and gets a stable URL-derived ID', () => {
  const a = validatePendingSource({
    name: 'Example',
    sourceUrl: 'https://github.com/example/repo/blob/main/example.lua',
    licenseDeclared: 'Unknown'
  });
  const b = validatePendingSource({
    name: 'Renamed title',
    sourceUrl: 'https://github.com/example/repo/blob/main/example.lua',
    licenseDeclared: 'Unknown'
  });
  assert.equal(a.id, b.id);
  assert.equal(a.license_status, 'pending_license');
  assert.equal(Object.hasOwn(a, 'code'), false);
  assert.equal(Object.hasOwn(a, 'content'), false);
});

test('pending source rejects accidentally supplied code', () => {
  assert.throws(() => validatePendingSource({
    name: 'Example', sourceUrl: 'https://example.com/source', code: 'print(1)'
  }), /metadata only/i);
});

test('script storage rejects unknown or non-allowlisted licenses', () => {
  const base = {
    name: 'Example', category: 'python', language: 'python', code: 'print(1)',
    licenseStatus: 'eligible', licenseSpdx: 'LicenseRef-Unknown',
    attribution: 'Example author', sourceCommit: 'abc1234', sourceUrl: 'https://github.com/example/repo/file.py',
    licenseUrl: 'https://github.com/example/repo/LICENSE'
  };
  assert.throws(() => validateScript(base), /not in RCC's current import allowlist/i);
  assert.throws(() => validateScript({ ...base, licenseSpdx: 'MIT', licenseStatus: 'pending_license' }), /eligible/i);
});

test('script validation calculates a content hash and maps language extensions', () => {
  const row = validateScript({
    name: 'Example', category: 'python', language: 'python', code: 'print(1)\n',
    licenseStatus: 'eligible', licenseSpdx: 'MIT', attribution: 'example/project',
    sourceUrl: 'https://github.com/example/project/blob/abc/src/main.py',
    licenseUrl: 'https://github.com/example/project/blob/abc/LICENSE', sourceCommit: 'abc'
  });
  assert.equal(row.extension, '.py');
  assert.equal(row.contentHash, sha256('print(1)\n'));
});

test('manager refuses writes when the target repository is public', async () => {
  const manager = createVaultManager({
    token: 'test-token', repository: 'example/public-vault',
    fetchImpl: async () => mockResponse(200, { private: false, visibility: 'public' })
  });
  await assert.rejects(manager.init(), /not private/i);
});

test('manager saves licensed script content and a separate metadata index in a private repository', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : null });
    if (url === 'https://api.github.com/repos/example/private-vault') {
      return mockResponse(200, { private: true, visibility: 'private' });
    }
    if (options.method === 'GET' && url.includes('/contents/')) {
      return mockResponse(404, { message: 'Not Found' });
    }
    if (options.method === 'PUT' && url.includes('/contents/')) {
      return mockResponse(201, { content: { sha: 'blob-sha' } });
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const manager = createVaultManager({
    token: 'test-token', repository: 'example/private-vault', fetchImpl
  });
  const result = await manager.saveScript({
    name: 'Example', category: 'python', language: 'python', code: 'print(1)\n',
    licenseStatus: 'eligible', licenseSpdx: 'MIT', attribution: 'example/project',
    sourceUrl: 'https://github.com/example/project/blob/abc/src/main.py',
    licenseUrl: 'https://github.com/example/project/blob/abc/LICENSE', sourceCommit: 'abc'
  });

  assert.equal(result.stored, true);
  assert.equal(result.duplicate, false);
  assert.equal(calls.filter(call => call.method === 'PUT').length, 2);
  assert.ok(calls.some(call => call.url.includes('/contents/python/')));
  assert.ok(calls.some(call => call.url.includes('/contents/index/python/')));
});


test('manager writes pending sources as metadata only', async () => {
  const writes = [];
  const fetchImpl = async (url, options) => {
    if (url === 'https://api.github.com/repos/example/private-vault') {
      return mockResponse(200, { private: true, visibility: 'private' });
    }
    if (options.method === 'GET' && url.includes('/contents/')) {
      return mockResponse(404, { message: 'Not Found' });
    }
    if (options.method === 'PUT' && url.includes('/contents/')) {
      writes.push(JSON.parse(options.body));
      return mockResponse(201, { content: { sha: 'blob-sha' } });
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };
  const manager = createVaultManager({ token: 'test-token', repository: 'example/private-vault', fetchImpl });
  const result = await manager.savePendingSource({
    name: 'Unlicensed candidate',
    sourceUrl: 'https://github.com/example/project/blob/main/file.lua',
    licenseDeclared: 'Unknown'
  });
  const storedJson = Buffer.from(writes[0].content, 'base64').toString('utf8');
  const storedRecord = JSON.parse(storedJson)[0];
  assert.equal(result.codeCopied, false);
  assert.equal(storedRecord.license_status, 'pending_license');
  assert.equal(Object.hasOwn(storedRecord, 'code'), false);
  assert.equal(Object.hasOwn(storedRecord, 'content'), false);
});


test('same code from two sources is stored once but keeps both attribution records', async () => {
  const files = new Map();
  let puts = 0;
  const fetchImpl = async (url, options) => {
    if (url === 'https://api.github.com/repos/example/private-vault') {
      return mockResponse(200, { private: true, visibility: 'private' });
    }
    const marker = '/contents/';
    const path = url.includes(marker) ? decodeURIComponent(url.split(marker)[1].split('?')[0]) : '';
    if (options.method === 'GET' && path) {
      if (!files.has(path)) return mockResponse(404, { message: 'Not Found' });
      return mockResponse(200, {
        type: 'file', sha: 'blob-' + path,
        content: Buffer.from(files.get(path), 'utf8').toString('base64')
      });
    }
    if (options.method === 'PUT' && path) {
      puts += 1;
      files.set(path, Buffer.from(JSON.parse(options.body).content, 'base64').toString('utf8'));
      return mockResponse(201, { content: { sha: 'blob-' + path } });
    }
    throw new Error('Unexpected request: ' + options.method + ' ' + url);
  };
  const manager = createVaultManager({ token: 'test-token', repository: 'example/private-vault', fetchImpl });
  const base = {
    name: 'Shared source code', category: 'python', language: 'python', code: 'print("same")\n',
    licenseStatus: 'eligible', licenseSpdx: 'MIT', attribution: 'Example author',
    sourceCommit: 'abc1234',
    licenseUrl: 'https://github.com/example/project/blob/abc1234/LICENSE'
  };
  const first = await manager.saveScript({
    ...base, sourceUrl: 'https://github.com/example/project/blob/abc1234/a.py'
  });
  const firstPutCount = puts;
  const second = await manager.saveScript({
    ...base, sourceUrl: 'https://github.com/another/project/blob/def5678/b.py',
    sourceRepository: 'another/project', sourceCommit: 'def5678'
  });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.sourceRecordDuplicate, false);
  assert.equal(puts, firstPutCount + 1, 'only the metadata index should be updated on second source');
  const indexPath = second.indexPath;
  const records = JSON.parse(files.get(indexPath));
  assert.equal(records.length, 2);
  assert.notEqual(records[0].id, records[1].id);
  assert.equal(records[0].content_sha256, records[1].content_sha256);
});
