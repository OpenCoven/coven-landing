#!/usr/bin/env python3
"""End-to-end test for the privacy-safe PostHog provisioner.

Proves without real credentials:
  run 1  every object is created and payloads match the explicit-event profile
  run 2  every object is updated by name with no duplicates
  run 3  one forced insight failure is isolated and returns exit 1

Usage: python3 analytics/test-provision.py
"""

import json
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).parent
STORE = {'actions': [], 'dashboards': [], 'insights': []}
PROJECT = {'id': 1, 'app_urls': ['https://existing.example']}
SCHEMA_ERRORS = []
FAIL_INSIGHT = {'name': None}

APPROVED_EVENTS = {
    'page_viewed',
    'hero_primary_clicked',
    'hero_secondary_clicked',
    'principle_opened',
    'guided_demo_started',
    'guided_demo_completed',
    'product_selected',
    'quickstart_command_copied',
    'download_menu_opened',
    'download_platform_selected',
    'download_started',
    'download_fallback_used',
    'docs_clicked',
    'github_clicked',
    'discord_clicked',
}


def check(condition, message):
    if not condition:
        SCHEMA_ERRORS.append(message)


def validate(kind, body):
    if kind == 'actions':
        check(body.get('name'), 'action missing name')
        steps = body.get('steps', [])
        check(len(steps) == 1, 'action must contain exactly one explicit event step')
        for action_step in steps:
            event = action_step.get('event')
            check(event in APPROVED_EVENTS, f'unapproved action event {event!r}')
            for forbidden in ('selector', 'text', 'url'):
                check(
                    forbidden not in action_step,
                    f'action event {event!r} retained {forbidden} autocapture matcher',
                )

    if kind == 'insights':
        query = body.get('query') or {}
        check(
            query.get('kind') == 'InsightVizNode',
            f'insight query.kind {query.get("kind")!r}',
        )
        source = query.get('source') or {}
        check(
            source.get('kind') in ('TrendsQuery', 'FunnelsQuery'),
            f'source.kind {source.get("kind")!r}',
        )
        for series in source.get('series', []):
            check(
                series.get('kind') in ('EventsNode', 'ActionsNode'),
                f'series kind {series.get("kind")!r}',
            )
            if series.get('kind') == 'EventsNode':
                check(
                    series.get('event') in APPROVED_EVENTS,
                    f'unapproved insight event {series.get("event")!r}',
                )
            if series.get('kind') == 'ActionsNode':
                check(isinstance(series.get('id'), int), 'ActionsNode.id not an int')
        if source.get('kind') == 'FunnelsQuery':
            filters = source.get('funnelsFilter') or {}
            check(
                'funnelWindowInterval' in filters
                and 'funnelWindowIntervalUnit' in filters,
                'funnelsFilter fields',
            )
        if body.get('dashboards') is not None:
            check(
                all(isinstance(dashboard, int) for dashboard in body['dashboards']),
                'dashboards not ids',
            )

    if kind == 'project':
        for field in (
            'session_recording_opt_in',
            'heatmaps_opt_in',
            'autocapture_web_vitals_opt_in',
            'app_urls',
        ):
            check(field in body, f'project PATCH missing {field}')
        check(
            body.get('session_recording_opt_in') is False,
            'session recording must remain disabled',
        )
        check(body.get('heatmaps_opt_in') is False, 'heatmaps must remain disabled')
        check(
            body.get('autocapture_web_vitals_opt_in') is False,
            'autocaptured web vitals must remain disabled',
        )
        check(
            'https://opencoven-redesign-preview.vercel.app'
            in body.get('app_urls', []),
            'siteUrl not in app_urls',
        )
        check(
            'https://existing.example' in body.get('app_urls', []),
            'existing app_urls clobbered',
        )


class Mock(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _read(self):
        length = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(length)) if length else None

    def _send(self, obj, code=200):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        check(
            self.headers.get('Authorization', '').startswith('Bearer '),
            'missing bearer token',
        )
        path = self.path.split('?')[0]
        match = re.fullmatch(
            r'/api/projects/1/(actions|dashboards|insights)/',
            path,
        )
        if match:
            kind = match.group(1)
            if kind == 'actions' and STORE['actions'] and 'page=2' not in self.path:
                half = len(STORE['actions']) // 2 or 1
                return self._send(
                    {
                        'results': STORE['actions'][:half],
                        'next': (
                            f'http://{self.headers["Host"]}'
                            '/api/projects/1/actions/?page=2'
                        ),
                    }
                )
            if kind == 'actions' and 'page=2' in self.path:
                half = len(STORE['actions']) // 2 or 1
                return self._send(
                    {'results': STORE['actions'][half:], 'next': None}
                )
            return self._send({'results': STORE[kind], 'next': None})
        if path == '/api/projects/1/':
            return self._send(PROJECT)
        return self._send({'detail': 'not found'}, 404)

    def do_POST(self):
        body = self._read()
        match = re.fullmatch(
            r'/api/projects/1/(actions|dashboards|insights)/',
            self.path,
        )
        if not match:
            return self._send({'detail': 'not found'}, 404)
        kind = match.group(1)
        if kind == 'insights' and body.get('name') == FAIL_INSIGHT['name']:
            return self._send({'detail': 'forced failure'}, 500)
        validate(kind, body)
        body['id'] = len(STORE[kind]) + 101
        STORE[kind].append(body)
        return self._send(body, 201)

    def do_PATCH(self):
        body = self._read()
        match = re.fullmatch(
            r'/api/projects/1/(actions|dashboards|insights)/(\d+)/',
            self.path,
        )
        if match:
            kind, object_id = match.group(1), int(match.group(2))
            validate(kind, body)
            obj = next(item for item in STORE[kind] if item['id'] == object_id)
            obj.update(body)
            return self._send(obj)
        if self.path == '/api/projects/1/':
            validate('project', body)
            PROJECT.update(body)
            return self._send(PROJECT)
        return self._send({'detail': 'not found'}, 404)


def run_provision(workdir):
    return subprocess.run(
        [sys.executable, str(workdir / 'provision.py')],
        capture_output=True,
        text=True,
    )


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), Mock)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]

    tmp = Path(tempfile.mkdtemp(prefix='ph-test-'))
    shutil.copy(HERE / 'provision.py', tmp / 'provision.py')
    (tmp / 'posthog.config.json').write_text(
        json.dumps(
            {
                'mode': 'events',
                'region': 'us',
                'apiHost': f'http://127.0.0.1:{port}',
                'projectApiKey': 'phc_test',
                'personalApiKey': 'phx_test',
                'projectId': '1',
                'siteUrl': 'https://opencoven-redesign-preview.vercel.app',
            }
        )
    )

    failures = []

    first = run_provision(tmp)
    created = first.stdout.count('new  ')
    if first.returncode != 0:
        failures.append(
            f'run1 exit {first.returncode}: {first.stdout}{first.stderr}'
        )
    if created < 20:
        failures.append(f'run1 created only {created} objects:\n{first.stdout}')

    second = run_provision(tmp)
    if second.returncode != 0:
        failures.append(f'run2 exit {second.returncode}')
    if 'new  ' in second.stdout:
        failures.append(
            f'run2 not idempotent — created duplicates:\n{second.stdout}'
        )
    counts = {kind: len(values) for kind, values in STORE.items()}
    unique_counts = {
        kind: len({item['name'] for item in values})
        for kind, values in STORE.items()
    }
    if counts != unique_counts:
        failures.append(f'duplicate names in store: {counts}')

    FAIL_INSIGHT['name'] = 'Top routes'
    for kind in STORE:
        STORE[kind] = [
            item for item in STORE[kind]
            if item.get('name') != 'Top routes'
        ]
    third = run_provision(tmp)
    if third.returncode != 1:
        failures.append(f'run3 expected exit 1, got {third.returncode}')
    if 'FAIL  insight: Top routes' not in third.stdout:
        failures.append(f'run3 missing FAIL line:\n{third.stdout}')
    if third.stdout.count('FAIL') != 1:
        failures.append(f'run3 failure not isolated:\n{third.stdout}')

    failures += [f'schema: {error}' for error in SCHEMA_ERRORS]

    print(first.stdout)
    print(
        'store after runs: '
        + str([f'{kind}:{len(values)}' for kind, values in STORE.items()])
    )
    if failures:
        print('\nTEST FAILURES:', *failures, sep='\n  ')
        sys.exit(1)
    print(
        '\nALL TESTS PASSED — explicit event allowlist, replay/heatmap disablement, '
        'create/update idempotence, pagination, schema shapes, and failure isolation'
    )


main()
