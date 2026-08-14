#!/usr/bin/env python3
"""End-to-end test for provision.py against a faithful mock of the PostHog API.

Proves, without real credentials:
  run 1  every object is CREATED (posted bodies pass schema assertions)
  run 2  every object is looked up by name and PATCHED, nothing duplicated
  run 3  a forced 500 on one insight reports FAIL + exit 1, everything else
         still provisions (failure isolation)

Usage: python3 analytics/test-provision.py
"""

import json
import re
import shutil
import subprocess
import sys
import threading
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).parent
STORE = {'actions': [], 'dashboards': [], 'insights': []}
PROJECT = {'id': 1, 'app_urls': ['https://existing.example']}
SCHEMA_ERRORS = []
FAIL_INSIGHT = {'name': None}  # set to an insight name to 500 its creation


def check(cond, msg):
    if not cond:
        SCHEMA_ERRORS.append(msg)


def validate(kind, body):
    if kind == 'actions':
        check(body.get('name'), 'action missing name')
        for s in body.get('steps', []):
            check(s.get('event') in ('$autocapture', '$pageview'), f'action step event {s.get("event")!r}')
            check(any(k in s for k in ('selector', 'text', 'url')), 'action step has no matcher')
    if kind == 'insights':
        q = body.get('query') or {}
        check(q.get('kind') == 'InsightVizNode', f'insight query.kind {q.get("kind")!r}')
        src = q.get('source') or {}
        check(src.get('kind') in ('TrendsQuery', 'FunnelsQuery'), f'source.kind {src.get("kind")!r}')
        for s in src.get('series', []):
            check(s.get('kind') in ('EventsNode', 'ActionsNode'), f'series kind {s.get("kind")!r}')
            if s.get('kind') == 'ActionsNode':
                check(isinstance(s.get('id'), int), 'ActionsNode.id not an int')
        if src.get('kind') == 'FunnelsQuery':
            ff = src.get('funnelsFilter') or {}
            check('funnelWindowInterval' in ff and 'funnelWindowIntervalUnit' in ff, 'funnelsFilter fields')
        if body.get('dashboards') is not None:
            check(all(isinstance(d, int) for d in body['dashboards']), 'dashboards not ids')
    if kind == 'project':
        for f in ('session_recording_opt_in', 'heatmaps_opt_in', 'autocapture_web_vitals_opt_in', 'app_urls'):
            check(f in body, f'project PATCH missing {f}')
        check('https://opencoven-redesign-preview.vercel.app' in body.get('app_urls', []), 'siteUrl not in app_urls')
        check('https://existing.example' in body.get('app_urls', []), 'existing app_urls clobbered')


class Mock(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _read(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n)) if n else None

    def _send(self, obj, code=200):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        check(self.headers.get('Authorization', '').startswith('Bearer '), 'missing bearer token')
        path = self.path.split('?')[0]
        m = re.fullmatch(r'/api/projects/1/(actions|dashboards|insights)/', path)
        if m:
            kind = m.group(1)
            # actions paginate in two pages to exercise paged()
            if kind == 'actions' and STORE['actions'] and 'page=2' not in self.path:
                half = len(STORE['actions']) // 2 or 1
                return self._send({'results': STORE['actions'][:half],
                                   'next': f'http://{self.headers["Host"]}/api/projects/1/actions/?page=2'})
            if kind == 'actions' and 'page=2' in self.path:
                half = len(STORE['actions']) // 2 or 1
                return self._send({'results': STORE['actions'][half:], 'next': None})
            return self._send({'results': STORE[kind], 'next': None})
        if path == '/api/projects/1/':
            return self._send(PROJECT)
        self._send({'detail': 'not found'}, 404)

    def do_POST(self):
        body = self._read()
        kind = re.fullmatch(r'/api/projects/1/(actions|dashboards|insights)/', self.path).group(1)
        if kind == 'insights' and body.get('name') == FAIL_INSIGHT['name']:
            return self._send({'detail': 'forced failure'}, 500)
        validate(kind, body)
        body['id'] = len(STORE[kind]) + 101
        STORE[kind].append(body)
        self._send(body, 201)

    def do_PATCH(self):
        body = self._read()
        m = re.fullmatch(r'/api/projects/1/(actions|dashboards|insights)/(\d+)/', self.path)
        if m:
            kind, oid = m.group(1), int(m.group(2))
            validate(kind, body)
            obj = next(o for o in STORE[kind] if o['id'] == oid)
            obj.update(body)
            return self._send(obj)
        if self.path == '/api/projects/1/':
            validate('project', body)
            PROJECT.update(body)
            return self._send(PROJECT)
        self._send({'detail': 'not found'}, 404)


def run_provision(workdir):
    return subprocess.run([sys.executable, str(workdir / 'provision.py')],
                          capture_output=True, text=True)


def main():
    srv = ThreadingHTTPServer(('127.0.0.1', 0), Mock)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]

    tmp = Path(tempfile.mkdtemp(prefix='ph-test-'))
    shutil.copy(HERE / 'provision.py', tmp / 'provision.py')
    (tmp / 'posthog.config.json').write_text(json.dumps({
        'region': 'us', 'apiHost': f'http://127.0.0.1:{port}',
        'projectApiKey': 'phc_test', 'personalApiKey': 'phx_test', 'projectId': '1',
        'siteUrl': 'https://opencoven-redesign-preview.vercel.app'}))

    failures = []

    r1 = run_provision(tmp)
    new = r1.stdout.count('new  ')
    if r1.returncode != 0: failures.append(f'run1 exit {r1.returncode}: {r1.stdout}{r1.stderr}')
    if new < 15: failures.append(f'run1 created only {new} objects:\n{r1.stdout}')

    r2 = run_provision(tmp)
    if r2.returncode != 0: failures.append(f'run2 exit {r2.returncode}')
    if 'new  ' in r2.stdout: failures.append(f'run2 not idempotent — created duplicates:\n{r2.stdout}')
    counts = {k: len(v) for k, v in STORE.items()}
    if counts != {k: len({o["name"] for o in v}) for k, v in STORE.items()}:
        failures.append(f'duplicate names in store: {counts}')

    FAIL_INSIGHT['name'] = 'Top referrers'
    for k in STORE: STORE[k] = [o for o in STORE[k] if o.get('name') != 'Top referrers']
    r3 = run_provision(tmp)
    if r3.returncode != 1: failures.append(f'run3 expected exit 1, got {r3.returncode}')
    if 'FAIL  insight: Top referrers' not in r3.stdout: failures.append(f'run3 missing FAIL line:\n{r3.stdout}')
    if r3.stdout.count('FAIL') != 1: failures.append(f'run3 failure not isolated:\n{r3.stdout}')

    failures += [f'schema: {e}' for e in SCHEMA_ERRORS]

    print(r1.stdout)
    print(f'store after runs: {[f"{k}:{len(v)}" for k, v in STORE.items()]}')
    if failures:
        print('\nTEST FAILURES:', *failures, sep='\n  ')
        sys.exit(1)
    print('\nALL TESTS PASSED — create, idempotent update, pagination, schema shapes, failure isolation')


main()
