"""Read public, commit-pinned source archives without extracting or executing files."""
import hashlib, io, json, pathlib, re, sys, tarfile, urllib.request

repo, category, maximum, cache = sys.argv[1:]
maximum = int(maximum)
headers = {'User-Agent': 'RCC-source-catalog/2', 'Accept': 'application/vnd.github+json'}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=120) as response:
        return response.read()
meta = json.loads(get('https://api.github.com/repos/' + repo))
commit = json.loads(get('https://api.github.com/repos/' + repo + '/commits/' + meta['default_branch']))['sha']
archive_url = 'https://codeload.github.com/' + repo + '/tar.gz/' + commit
cache_path = pathlib.Path(cache) / (repo.replace('/', '-') + '-' + commit + '.tar.gz')
cache_path.parent.mkdir(parents=True, exist_ok=True)
if not cache_path.exists():
    cache_path.write_bytes(get(archive_url))
blob = cache_path.read_bytes()
with tarfile.open(fileobj=io.BytesIO(blob), mode='r:gz') as archive:
    members = archive.getmembers()
    licenses = [m for m in members if m.isfile() and m.name.count('/') == 1 and re.match(r'(?i)(license|copying)(\..*)?$', m.name.split('/')[-1])]
    if not licenses:
        raise ValueError('No root license: ' + repo)
    license_text = archive.extractfile(licenses[0]).read().decode('utf-8')
    spdx = meta.get('license', {}).get('spdx_id')
    if spdx not in ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense', 'CC0-1.0', 'GPL-3.0', 'LGPL-3.0']:
        raise ValueError('Unsupported license: ' + str(spdx))
    notices = [m for m in members if m.isfile() and m.name.count('/') == 1 and re.match(r'(?i)notice(\..*)?$', m.name.split('/')[-1])]
    for notice in notices:
        license_text += '\n\nOriginal NOTICE:\n' + archive.extractfile(notice).read().decode('utf-8')
    extensions = {'java': ('.java',), 'universal': ('.py', '.sh', '.lua', '.ps1'), 'web': ('.js', '.mjs', '.ts'), 'roblox': ('.lua', '.luau'), 'fivem': ('.lua', '.js')}[category]
    skip = re.compile(r'(?i)(^|/)(node_modules|vendor|dist|build|target|\.git|test|tests|__tests__|fixtures|generated|mocks)(/|$)|\.(min|spec|test)\.')
    nested_licenses = [m.name.rsplit('/', 1)[0] + '/' for m in members if m.isfile() and m.name.count('/') > 1 and re.match(r'(?i)(license|copying)(\..*)?$', m.name.split('/')[-1])]
    files = []
    for m in sorted(members, key=lambda m: m.name):
        name = m.name.partition('/')[2]
        if not m.isfile() or not name.endswith(extensions) or not 200 <= m.size <= 60000 or skip.search(name): continue
        if any(m.name.startswith(prefix) for prefix in nested_licenses): continue
        if repo == 'eugenp/tutorials' and '/src/main/' not in name: continue
        try: code = archive.extractfile(m).read().decode('utf-8')
        except UnicodeError: continue
        if '\0' in code or len(code.splitlines()) < 8: continue
        files.append({'path': name, 'content': code, 'size': m.size, 'sha': hashlib.sha256(code.encode()).hexdigest()})
        if len(files) >= maximum: break
print(json.dumps({'repo': dict(meta, default_branch=commit), 'commit': commit, 'licenseText': license_text, 'spdx': spdx, 'archiveUrl': archive_url, 'archiveSha256': hashlib.sha256(blob).hexdigest(), 'files': files}))
