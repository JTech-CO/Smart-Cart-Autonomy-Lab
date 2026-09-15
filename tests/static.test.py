"""Dependency-free source, path and HTTP-delivery regression.

A temporary loopback-only static HTTP server verifies bytes and MIME types.
This does not claim browser HTTP navigation or a remote GitHub deployment.
"""
from pathlib import Path
from html.parser import HTMLParser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.request import urlopen
from urllib.parse import urlsplit, unquote, quote
from functools import partial
import json, re, subprocess, threading, time

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'simulator'
results = []

def check(name, condition, detail=None):
    row = dict(name=name, status='PASS' if condition else 'FAIL', detail=detail)
    results.append(row)
    print(row)

class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.scripts = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ('src', 'href'):
            if key in attrs:
                self.refs.append(attrs[key])
        if tag == 'script' and 'src' in attrs:
            self.scripts.append(attrs)

for p in sorted((SITE / 'js').glob('*.js')):
    process = subprocess.run(['node', '--check', str(p)], capture_output=True, text=True)
    check('JavaScript syntax: ' + p.name, process.returncode == 0, process.stderr or None)

pages = [ROOT / 'index.html', SITE / 'index.html']
for page in pages:
    parser = Resources()
    parser.feed(page.read_text(encoding='utf-8'))
    unresolved = []
    remote = []
    for ref in parser.refs:
        parsed = urlsplit(ref)
        if parsed.scheme or ref.startswith('//'):
            remote.append(ref)
        elif parsed.path and not (page.parent / unquote(parsed.path)).exists():
            unresolved.append(ref)
    check('Local page assets and links: ' + str(page.relative_to(ROOT)), not unresolved, unresolved)
    check('No external page assets: ' + str(page.relative_to(ROOT)), not remote, remote)
    check('Classic local scripts: ' + str(page.relative_to(ROOT)), all(s.get('type') != 'module' and not s['src'].startswith('/') for s in parser.scripts))

broken = []
for doc in sorted(ROOT.rglob('*.md')):
    for ref in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)', doc.read_text(encoding='utf-8')):
        ref = ref.strip().split(' "', 1)[0]
        parsed = urlsplit(ref)
        if not parsed.scheme and parsed.path and not (doc.parent / unquote(parsed.path)).exists():
            broken.append({'file': str(doc.relative_to(ROOT)), 'reference': ref})
check('Local Markdown references resolve', not broken, broken)

utf_errors = []
for p in ROOT.rglob('*'):
    if p.is_file() and p.suffix in {'.html', '.css', '.js', '.md', '.json', '.yml', '.py', '.cjs', '.svg'}:
        try:
            p.read_text(encoding='utf-8')
        except UnicodeError:
            utf_errors.append(str(p.relative_to(ROOT)))
check('Text files are valid UTF-8', not utf_errors, utf_errors)
check('No redistributed font binaries', not any(p.suffix.lower() in {'.woff','.woff2','.ttf','.otf'} for p in ROOT.rglob('*')))
check('Pages root and simulator bypass Jekyll', (ROOT/'.nojekyll').exists() and (SITE/'.nojekyll').exists())
wf = (ROOT/'.github/workflows/deploy-simulator.yml').read_text()
check('Pages workflow publishes static simulator and runs core regression', 'path: simulator' in wf and 'node tests/core.test.cjs' in wf and 'pages: write' in wf and 'id-token: write' in wf)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

# Both upload-artifact root layout and a nested project/repository layout.
for directory, prefix, label in [(SITE, '/', 'Pages artifact root'), (ROOT.parent, '/'+ROOT.name+'/simulator/', 'Repository subdirectory')]:
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(directory)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    deliveries = []
    try:
        for path in [SITE/'index.html', *sorted((SITE/'js').glob('*.js')), SITE/'css/app.css', SITE/'assets/favicon.svg']:
            relative = path.relative_to(SITE).as_posix()
            url = f'http://127.0.0.1:{server.server_port}' + prefix + quote(relative)
            with urlopen(url, timeout=8) as response:
                body = response.read()
                mime = response.headers.get_content_type()
                status = response.status
            mime_ok = (path.suffix != '.js' or mime in {'text/javascript', 'application/javascript'}) and (path.suffix != '.css' or mime == 'text/css')
            deliveries.append(dict(path=relative, status=status, mime=mime, bytes=len(body), matches=body == path.read_bytes(), mime_ok=mime_ok))
        check(label + ': HTTP 200, matching bytes and executable MIME', all(d['status']==200 and d['matches'] and d['mime_ok'] for d in deliveries), deliveries)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)

report = {'suite': 'Static source and HTTP delivery', 'executedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()), 'passed':sum(r['status']=='PASS' for r in results), 'failed':sum(r['status']=='FAIL' for r in results), 'tests':results, 'scope':'Loopback Python HTTP delivery is verified. Managed-browser file/HTTP navigation and remote GitHub Pages deployment are not verified.'}
(ROOT/'tests/static-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print('RESULT', report['passed'], report['failed'])
if report['failed']:
    raise SystemExit(1)
