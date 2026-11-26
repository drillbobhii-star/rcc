import { createHash } from 'node:crypto';

const API = 'https://api.github.com';
const RCC_PUBLIC_REPOSITORY = 'drillbobhii-star/rcc';
const ALLOWED_LICENSES = new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC',
  '0BSD', 'Unlicense', 'Zlib', 'CC0-1.0'
]);
const CATEGORIES = new Set([
  'roblox-studio', 'roblox-exploits', 'fivem', 'python', 'javascript', 'others'
]);
const EXTENSIONS = new Map([
  ['lua', '.lua'], ['luau', '.luau'], ['python', '.py'], ['py', '.py'],
  ['javascript', '.js'], ['js', '.js'], ['typescript', '.ts'], ['ts', '.ts'],
  ['java', '.java'], ['csharp', '.cs'], ['c#', '.cs'], ['shell', '.sh'],
  ['bash', '.sh'], ['powershell', '.ps1']
]);
const MAX_CODE_BYTES = 1024 * 1024;
const MAX_INDEX_RETRIES = 4;

export class VaultError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'VaultError';
    Object.assign(this, details);
  }
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function requiredString(value, field, max = 500) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new VaultError(`${field} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > max) throw new VaultError(`${field} exceeds ${max} characters.`);
  return normalized;
}

function optionalString(value, max = 500) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new VaultError('Optional metadata fields must be strings.');
  const normalized = value.trim();
  if (normalized.length > max) throw new VaultError(`Metadata field exceeds ${max} characters.`);
  return normalized || null;
}

function safeHttpsUrl(value, field = 'sourceUrl') {
  const raw = requiredString(value, field, 2048);
  let url;
  try { url = new URL(raw); } catch { throw new VaultError(`${field} must be a valid HTTPS URL.`); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new VaultError(`${field} must be a public HTTPS URL without embedded credentials.`);
  }
  return url.toString();
}

function normalizeCategory(value) {
  const category = requiredString(value, 'category', 50).toLowerCase();
  if (!CATEGORIES.has(category)) throw new VaultError(`Unsupported category: ${category}`);
  return category;
}

function parseRepository(value) {
  const repository = requiredString(value, 'GITHUB_VAULT_REPOSITORY', 200);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new VaultError('GITHUB_VAULT_REPOSITORY must use owner/repository format.');
  }
  if (repository.toLowerCase() === RCC_PUBLIC_REPOSITORY) {
    throw new VaultError('The RCC website repository is public. Configure a separate private GitHub repository for the Vault.');
  }
  return repository;
}

/**
 * Build a metadata-only candidate. Deliberately rejects code/content fields so a
 * source with an unknown or incompatible license cannot be copied by accident.
 */
export function validatePendingSource(input = {}) {
  if (['code', 'content', 'source_code', 'raw_code'].some(key => Object.hasOwn(input, key))) {
    throw new VaultError('Pending sources may contain metadata only; code must not be included.');
  }
  const name = requiredString(input.name, 'name', 200);
  const sourceUrl = safeHttpsUrl(input.sourceUrl ?? input.source_url);
  const category = input.category ? normalizeCategory(input.category) : 'others';
  const status = input.status ?? 'pending_license';
  if (!['pending_license', 'source_only'].includes(status)) {
    throw new VaultError('Pending source status must be pending_license or source_only.');
  }
  const id = sha256(sourceUrl).slice(0, 32);
  return {
    id,
    name,
    source_url: sourceUrl,
    source_repository: optionalString(input.sourceRepository ?? input.source_repository, 300),
    source_commit: optionalString(input.sourceCommit ?? input.source_commit, 100),
    original_path: optionalString(input.originalPath ?? input.original_path, 1000),
    category,
    license_declared: optionalString(input.licenseDeclared ?? input.license_declared, 100),
    license_status: status,
    reason: optionalString(input.reason, 500) ?? 'License could not be verified.',
    detected_at: optionalString(input.detectedAt ?? input.detected_at, 50) ?? new Date().toISOString()
  };
}

/** Validate a script before its contents are allowed into the private Vault. */
export function validateScript(input = {}) {
  const name = requiredString(input.name, 'name', 200);
  const category = normalizeCategory(input.category);
  const language = requiredString(input.language, 'language', 40).toLowerCase();
  const extension = EXTENSIONS.get(language);
  if (!extension) throw new VaultError(`Unsupported language: ${language}`);
  if (input.licenseStatus !== 'eligible') {
    throw new VaultError('Only scripts with licenseStatus="eligible" may be stored.');
  }
  const licenseSpdx = requiredString(input.licenseSpdx ?? input.license_spdx, 'licenseSpdx', 80);
  if (!ALLOWED_LICENSES.has(licenseSpdx)) {
    throw new VaultError(`License ${licenseSpdx} is not in RCC's current import allowlist.`);
  }
  const attribution = requiredString(input.attribution, 'attribution', 500);
  const sourceUrl = safeHttpsUrl(input.sourceUrl ?? input.source_url);
  const licenseUrl = safeHttpsUrl(input.licenseUrl ?? input.license_url, 'licenseUrl');
  if (typeof input.code !== 'string' || !input.code.trim()) {
    throw new VaultError('code must be a non-empty UTF-8 text string.');
  }
  const codeBytes = Buffer.byteLength(input.code, 'utf8');
  if (codeBytes > MAX_CODE_BYTES) {
    throw new VaultError(`Script exceeds the ${MAX_CODE_BYTES}-byte Vault limit.`);
  }
  return {
    name,
    category,
    language,
    extension,
    code: input.code,
    codeBytes,
    contentHash: sha256(input.code),
    sourceUrl,
    sourceRepository: optionalString(input.sourceRepository ?? input.source_repository, 300),
    sourceCommit: optionalString(input.sourceCommit ?? input.source_commit, 100),
    originalPath: optionalString(input.originalPath ?? input.original_path, 1000),
    licenseSpdx,
    licenseUrl,
    attribution,
    licenseTextHash: optionalString(input.licenseTextHash ?? input.license_text_hash, 64)
  };
}

function encodePath(path) {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function decodeBase64Text(value) {
  return Buffer.from(String(value || '').replace(/\s/g, ''), 'base64').toString('utf8');
}

export function createVaultManager({
  token = process.env.GITHUB_VAULT_TOKEN,
  repository = process.env.GITHUB_VAULT_REPOSITORY,
  branch = process.env.GITHUB_VAULT_BRANCH || 'main',
  fetchImpl = globalThis.fetch
} = {}) {
  const accessToken = requiredString(token, 'GITHUB_VAULT_TOKEN', 500);
  const targetRepository = parseRepository(repository);
  const targetBranch = requiredString(branch, 'GITHUB_VAULT_BRANCH', 200);
  if (typeof fetchImpl !== 'function') throw new VaultError('A Fetch API implementation is required.');

  const [owner, repo] = targetRepository.split('/');
  let privateRepositoryVerified = false;

  async function request(method, path, body) {
    const response = await fetchImpl(`${API}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'RCC-Vault-Manager'
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const raw = await response.text();
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); }
      catch { throw new VaultError(`GitHub returned non-JSON data (${response.status}).`, { status: response.status }); }
    }
    if (!response.ok) {
      throw new VaultError(data?.message || `GitHub API request failed (${response.status}).`, {
        status: response.status,
        response: data
      });
    }
    return data;
  }

  async function assertPrivateRepository() {
    if (privateRepositoryVerified) return;
    const data = await request('GET', `/repos/${owner}/${repo}`);
    if (data?.private !== true && data?.visibility !== 'private') {
      throw new VaultError('Vault writes blocked: the configured GitHub repository is not private.');
    }
    privateRepositoryVerified = true;
  }

  async function getFile(path) {
    try {
      const data = await request('GET', `/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(targetBranch)}`);
      if (!data || data.type !== 'file') throw new VaultError(`Expected a file at ${path}.`);
      return { sha: data.sha, content: decodeBase64Text(data.content) };
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async function putFile(path, content, message, currentSha = null) {
    return request('PUT', `/repos/${owner}/${repo}/contents/${encodePath(path)}`, {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: targetBranch,
      ...(currentSha ? { sha: currentSha } : {})
    });
  }

  async function ensureTextFile(path, content, message) {
    const existing = await getFile(path);
    if (existing) return { created: false, path };
    await putFile(path, content, message);
    return { created: true, path };
  }

  async function appendPartition(path, record, key = 'id') {
    for (let attempt = 1; attempt <= MAX_INDEX_RETRIES; attempt += 1) {
      const existing = await getFile(path);
      let records = [];
      if (existing) {
        try { records = JSON.parse(existing.content); }
        catch { throw new VaultError(`Vault index is invalid JSON: ${path}`); }
        if (!Array.isArray(records)) throw new VaultError(`Vault index must contain an array: ${path}`);
      }
      if (records.some(item => item?.[key] === record[key])) {
        return { inserted: false, path, count: records.length };
      }
      records.push(record);
      try {
        await putFile(path, `${JSON.stringify(records, null, 2)}\n`, `vault: add ${record.name || record.id}`, existing?.sha ?? null);
        return { inserted: true, path, count: records.length };
      } catch (error) {
        if (![409, 422].includes(error.status) || attempt === MAX_INDEX_RETRIES) throw error;
        // Another writer may have updated this shard. Re-read and merge on retry.
      }
    }
    throw new VaultError(`Could not update index shard ${path} after retries.`);
  }

  async function init() {
    await assertPrivateRepository();
    const readme = [
      '# RCC Script Vault', '',
      'Private staging repository for RCC source code and source-review metadata.', '',
      '## Safety rules',
      '- This repository must remain **private**. The manager refuses writes to public repositories.',
      '- Only code with a verified SPDX license in RCC’s current import allowlist may be stored.',
      '- Unknown or incompatible licenses are recorded as metadata only under `pending/`; their code is never copied.',
      '- Files are stored as inert text. RCC Vault does not execute imported code.',
      '- A stored script is not automatically safe, functional, or ready for the public RCC catalog.', '',
      '## Layout',
      '- Category directories contain content-addressed files, grouped by the first two SHA-256 characters.',
      '- `index/<category>/<prefix>.json` contains metadata shards for stored scripts.',
      '- `pending/<prefix>.json` contains metadata-only source candidates.', '',
      '## Categories',
      ...[...CATEGORIES].map(category => `- \`${category}/\``), ''
    ].join('\n');

    const results = [];
    results.push(await ensureTextFile('README.md', `${readme}\n`, 'vault: initialize private vault'));
    for (const category of CATEGORIES) {
      results.push(await ensureTextFile(`${category}/.gitkeep`, '', `vault: initialize ${category}`));
    }
    results.push(await ensureTextFile('index/README.md', '# Script indexes\n\nMetadata is split by category and SHA-256 prefix to avoid one ever-growing index file.\n', 'vault: document index layout'));
    results.push(await ensureTextFile('pending/README.md', '# Pending sources\n\nMetadata only. Never place source code in this directory.\n', 'vault: document pending sources'));
    return { repository: targetRepository, branch: targetBranch, files: results };
  }

  async function savePendingSource(input) {
    await assertPrivateRepository();
    const record = validatePendingSource(input);
    const shard = record.id.slice(0, 2);
    const path = `pending/${shard}.json`;
    const result = await appendPartition(path, record, 'id');
    return { ...result, id: record.id, status: record.license_status, codeCopied: false };
  }

  async function saveScript(input) {
    await assertPrivateRepository();
    const record = validateScript(input);
    const hash = record.contentHash;
    const path = `${record.category}/${hash.slice(0, 2)}/${hash}${record.extension}`;
    const indexPath = `index/${record.category}/${hash.slice(0, 2)}.json`;
    const existingFile = await getFile(path);
    if (existingFile && sha256(existingFile.content) !== hash) {
      throw new VaultError(`Content-address collision or corrupted Vault file: ${path}`);
    }
    if (!existingFile) {
      await putFile(path, record.code, `vault: store ${record.name}`);
    }
    const metadata = {
      id: hash,
      name: record.name,
      language: record.language,
      category: record.category,
      source_url: record.sourceUrl,
      source_repository: record.sourceRepository,
      source_commit: record.sourceCommit,
      original_path: record.originalPath,
      license_spdx: record.licenseSpdx,
      license_url: record.licenseUrl,
      license_text_sha256: record.licenseTextHash,
      attribution: record.attribution,
      content_sha256: hash,
      github_path: path,
      created_at: new Date().toISOString()
    };
    const indexed = await appendPartition(indexPath, metadata, 'id');
    return {
      stored: true,
      duplicate: !indexed.inserted,
      codeBytes: record.codeBytes,
      contentHash: hash,
      githubPath: path,
      indexPath,
      indexCount: indexed.count
    };
  }

  return Object.freeze({
    repository: targetRepository,
    branch: targetBranch,
    init,
    savePendingSource,
    saveScript
  });
}
