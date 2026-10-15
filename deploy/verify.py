import concurrent.futures
import hashlib
import json
import pathlib
import urllib.error
import urllib.request

root = pathlib.Path(__file__).resolve().parent
release = (root / 'latest-release.txt').read_text().strip()
base = 'https://47.107.99.105/games/'
checks = [line.split('  ', 1) for line in (root / 'builds' / release / 'SHA256SUMS').read_text().splitlines()]

def verify(entry):
    expected, name = entry
    with urllib.request.urlopen(base + name, timeout=45) as response:
        data = response.read()
        assert response.status == 200, name
        assert hashlib.sha256(data).hexdigest() == expected, name + ': checksum mismatch'
        if name.endswith('.png'):
            assert response.headers.get_content_type() == 'image/png', name
        if name.endswith('.mp3'):
            assert response.headers.get_content_type() == 'audio/mpeg', name
        if name.endswith('.svg'):
            assert response.headers.get_content_type() == 'image/svg+xml', name
        return {'file': name, 'status': 200, 'bytes': len(data), 'sha256': expected}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(verify, checks))
for name in ['.env', 'server.js', 'accounts-api.js', '.data/accounts.json', 'deploy/install.sh', 'assets/sea/v1/generation-sources.json']:
    try:
        urllib.request.urlopen(base + name, timeout=15)
        raise AssertionError('Unexpected published file: ' + name)
    except urllib.error.HTTPError as error:
        assert error.code == 404, (name, error.code)
with urllib.request.urlopen(base.rstrip('/'), timeout=15) as response:
    assert response.url == base
with urllib.request.urlopen(base + 'api/health', timeout=15) as response:
    assert json.load(response)['ok'] is True
with urllib.request.urlopen(base + 'api/me', timeout=15) as response:
    assert json.load(response)['user'] is None
for name, method, payload, origin, expected in [
    ('sea-save', 'GET', None, True, 401),
    ('sea-save', 'PUT', {}, True, 401),
    ('register', 'POST', {}, True, 400),
    ('logout', 'POST', {}, False, 403),
]:
    request = urllib.request.Request(base + 'api/' + name, data=json.dumps(payload).encode() if payload is not None else None, method=method,
        headers={'Content-Type':'application/json', **({'Origin':'https://47.107.99.105'} if origin else {})})
    try:
        urllib.request.urlopen(request, timeout=15)
        raise AssertionError('Unexpected accepted request: ' + name)
    except urllib.error.HTTPError as error:
        assert error.code == expected, (name, error.code)
        assert 'error' in json.load(error)
report = {'release': release, 'url': base, 'tls': 'verified', 'files': results, 'excluded_files': '404', 'slash_redirect': 'passed', 'api_health': 'passed', 'guest_access_and_origin_checks': 'passed'}
(root / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'url': base, 'release': release, 'verified_files': len(results), 'tls': 'valid', 'excluded_files': '404'}))
