# RCC Vault — GitHub-only storage

## Purpose

RCC Vault is a private staging repository for source files and candidate-source metadata. It is separate from the public RCC catalog. A file in the Vault is not automatically published, safe, functional, or approved for execution.

The manager lives in this RCC repository at `tools/rcc-vault.mjs`, but **the scripts themselves must be written to a separate private GitHub repository**. The manager refuses to write to the public `drillbobhii-star/rcc` repository and checks the target repository's `private` flag before each write session.

## Why a separate private repository is mandatory

The RCC website repository is public. Putting collected source files or a private staging index under its `vault/` folder would publish them. Do not change the visibility of the production RCC website repository to solve this. Create a separate private repository, for example `drillbobhii-star/rcc-vault`, and keep its visibility private.

## One-time GitHub setup

1. Create a new **private** repository named `rcc-vault` under the RCC owner account. An empty repository is sufficient; do not add a README from the GitHub wizard if you prefer the manager to initialize it.
2. Create a fine-grained Personal Access Token restricted to that repository. Grant **Contents: Read and write** and **Metadata: Read-only**. Do not use a classic token with broad `repo` access unless fine-grained access is unavailable.
3. Add these variables to the worker that will run the collector (Railway is the intended existing host):
   - `GITHUB_VAULT_REPOSITORY=drillbobhii-star/rcc-vault`
   - `GITHUB_VAULT_TOKEN` = the token, stored as a secret
   - `GITHUB_VAULT_BRANCH=main` (optional; defaults to `main`)
4. Never commit the token to Git, source files, logs, issue comments, or chat. Rotate it immediately if exposed.
5. Run `createVaultManager().init()` once to create the category folders and documentation in the private repository.

The current GitHub connection can write to the RCC source repository, but this change does not create the separate private repository or configure Railway variables. Those actions require the repository-creation UI and the user's secret configuration.

## Repository layout

The manager initializes these category directories:

- `roblox-studio/`
- `roblox-exploits/`
- `fivem/`
- `python/`
- `javascript/`
- `others/`

Script files are content-addressed using SHA-256 and stored at:

`<category>/<first-two-hash-characters>/<sha256>.<extension>`

Metadata is sharded by category and the first two hash characters:

`index/<category>/<first-two-hash-characters>.json`

This avoids a single ever-growing `index.json`. Pending candidates are metadata-only and stored in:

`pending/<first-two-hash-characters>.json`

## Integration API

```js
import { createVaultManager } from './tools/rcc-vault.mjs';

const vault = createVaultManager();

// Run once after creating the separate private repository.
await vault.init();

// Unknown/unverified license: saves the source reference only. No code is accepted.
await vault.savePendingSource({
  name: 'Example source',
  sourceUrl: 'https://github.com/owner/project/blob/COMMIT/path/file.lua',
  sourceRepository: 'owner/project',
  sourceCommit: 'COMMIT',
  originalPath: 'path/file.lua',
  category: 'roblox-studio',
  licenseDeclared: 'Unknown',
  status: 'pending_license'
});

// Known, compatible license: stores code and an indexed metadata record.
await vault.saveScript({
  name: 'Example module',
  category: 'roblox-studio',
  language: 'luau',
  code: '-- source text',
  licenseStatus: 'eligible',
  licenseSpdx: 'MIT',
  licenseUrl: 'https://github.com/owner/project/blob/COMMIT/LICENSE',
  attribution: 'owner/project',
  sourceUrl: 'https://github.com/owner/project/blob/COMMIT/path/file.luau',
  sourceRepository: 'owner/project',
  sourceCommit: 'COMMIT',
  originalPath: 'path/file.luau'
});
```

The manager is a storage layer, not a crawler or a legal-review engine. The collector must obtain source data separately, pin it to a commit, verify the license and preserve attribution before calling `saveScript`.

## License and safety policy

- `saveScript()` accepts only `licenseStatus: 'eligible'` and an SPDX identifier in the same allowlist currently used by `tools/import-github-resources.cjs`: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Unlicense, Zlib, and CC0-1.0.
- A missing, unknown, incompatible, or unverified license must go through `savePendingSource()`. That function rejects `code`, `content`, and raw-code fields.
- A manual RCC decision does not create redistribution rights. A pending source must be checked against its actual license or explicit permission before code is copied.
- The manager stores text only, enforces a 1 MiB per-file limit, calculates SHA-256, and never executes code.
- Do not ingest malware, credential theft, keyloggers, backdoors, or other harmful payloads. Importing source text is not a security audit.
- This manager does not publish files into `scripts.json` or the public RCC catalog. A separate review/import step must preserve license notices and attribution and run RCC's catalog validation.

## Tests

Run:

```bash
npm run test:vault
```

The tests use a mocked GitHub API; they do not write to GitHub, Railway, Cloudflare, or Supabase.
