#!/usr/bin/env python3
"""Provision the privacy-safe PostHog workspace for the OpenCoven site.

The approved landing profile uses explicit, allowlisted events only. This
script keeps session recording, heatmaps, and autocaptured web vitals disabled
at project level, then creates or updates matching actions, dashboards, and
insights by canonical name.

Idempotent: existing objects are updated in place. One failed object is
reported without aborting unrelated work, and the process exits non-zero when
any step failed.

Requires: personalApiKey (action:write, insight:write, dashboard:write,
project:write), projectId, region, and siteUrl in posthog.config.json.

Usage: python3 analytics/provision.py [--dry-run]
"""

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
CFG = json.loads((HERE / 'posthog.config.json').read_text(encoding='utf-8'))
REGION = (CFG.get('region') or 'us').strip().lower()
API = (CFG.get('apiHost') or '').rstrip('/') or f'https://{REGION}.posthog.com'
PID = str(CFG.get('projectId') or '').strip()
TOKEN = (CFG.get('personalApiKey') or '').strip()
SITE = (CFG.get('siteUrl') or '').rstrip('/')
DRY = '--dry-run' in sys.argv


def call(method, path, body=None):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={
            'Authorization': f'Bearer {TOKEN}',
            'Content-Type': 'application/json',
        },
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read() or 'null')


def paged(path):
    out, url = [], path
    while url:
        data = call('GET', url)
        out += data.get('results', [])
        url = data.get('next')
        if url and url.startswith(API):
            url = url[len(API):]
    return out


REPORT = []


def step(kind, name, fn):
    if DRY:
        REPORT.append(f'DRY   {kind}: {name}')
        return None
    try:
        result, verb = fn()
        REPORT.append(f'{verb:5} {kind}: {name}')
        return result
    except urllib.error.HTTPError as error:
        REPORT.append(
            f'FAIL  {kind}: {name} — HTTP {error.code}: {error.read()[:200]!r}'
        )
    except Exception as error:  # noqa: BLE001 — report and continue is the contract
        REPORT.append(f'FAIL  {kind}: {name} — {error}')
    return None


def ensure_action(name, event_name, description=''):
    def fn():
        existing = next((action for action in ACTIONS if action['name'] == name), None)
        body = {
            'name': name,
            'steps': [{'event': event_name}],
            'description': description,
        }
        if existing:
            return (
                call(
                    'PATCH',
                    f'/api/projects/{PID}/actions/{existing["id"]}/',
                    body,
                ),
                'ok',
            )
        return call('POST', f'/api/projects/{PID}/actions/', body), 'new'

    return step('action', name, fn)


def ensure_dashboard(name, description=''):
    def fn():
        existing = next(
            (dashboard for dashboard in DASHBOARDS if dashboard['name'] == name),
            None,
        )
        if existing:
            return existing, 'ok'
        return (
            call(
                'POST',
                f'/api/projects/{PID}/dashboards/',
                {'name': name, 'description': description},
            ),
            'new',
        )

    return step('dashboard', name, fn)


def ensure_insight(name, query, dashboard):
    def fn():
        existing = next(
            (insight for insight in INSIGHTS if insight.get('name') == name),
            None,
        )
        body = {
            'name': name,
            'query': {'kind': 'InsightVizNode', 'source': query},
            'saved': True,
        }
        if dashboard:
            current = set(existing.get('dashboards') or []) if existing else set()
            body['dashboards'] = sorted(current | {dashboard['id']})
        if existing:
            return (
                call(
                    'PATCH',
                    f'/api/projects/{PID}/insights/{existing["id"]}/',
                    body,
                ),
                'ok',
            )
        return call('POST', f'/api/projects/{PID}/insights/', body), 'new'

    return step('insight', name, fn)


def events(*names, math='total'):
    return [
        {'kind': 'EventsNode', 'event': name, 'name': name, 'math': math}
        for name in names
    ]


def action_node(action, math='total'):
    return {
        'kind': 'ActionsNode',
        'id': action['id'],
        'name': action['name'],
        'math': math,
    }


def trends(series, display='ActionsLineGraph', breakdown=None, interval='day'):
    query = {
        'kind': 'TrendsQuery',
        'series': series,
        'interval': interval,
        'trendsFilter': {'display': display},
    }
    if breakdown:
        query['breakdownFilter'] = {
            'breakdown': breakdown,
            'breakdown_type': 'event',
        }
    return query


def funnel(series):
    return {
        'kind': 'FunnelsQuery',
        'series': series,
        'funnelsFilter': {
            'funnelWindowInterval': 1,
            'funnelWindowIntervalUnit': 'day',
        },
    }


def project_settings():
    project = call('GET', f'/api/projects/{PID}/')
    app_urls = set(project.get('app_urls') or [])
    if SITE:
        app_urls.add(SITE)
    return (
        call(
            'PATCH',
            f'/api/projects/{PID}/',
            {
                'session_recording_opt_in': False,
                'heatmaps_opt_in': False,
                'autocapture_web_vitals_opt_in': False,
                'app_urls': sorted(app_urls),
            },
        ),
        'ok',
    )


if not DRY and not (TOKEN and PID):
    sys.exit('posthog: fill personalApiKey and projectId in posthog.config.json first')

ACTIONS = [] if DRY else paged(f'/api/projects/{PID}/actions/')
DASHBOARDS = [] if DRY else paged(f'/api/projects/{PID}/dashboards/')
INSIGHTS = (
    []
    if DRY
    else paged(f'/api/projects/{PID}/insights/?saved=true&limit=300')
)

step(
    'project',
    'privacy-safe settings (replay off · heatmaps off · web-vitals autocapture off)',
    project_settings,
)

# Durable action names map only to the explicit client event allowlist.
a_page = ensure_action('Page viewed', 'page_viewed', 'Public route path only')
ensure_action('Hero primary clicked', 'hero_primary_clicked')
ensure_action('Hero secondary clicked', 'hero_secondary_clicked')
ensure_action('Principle opened', 'principle_opened')
ensure_action('Guided demo started', 'guided_demo_started')
ensure_action('Guided demo completed', 'guided_demo_completed')
a_product = ensure_action('Product selected', 'product_selected')
a_copy = ensure_action(
    'Quickstart command copied',
    'quickstart_command_copied',
    'Command identifier only; never command text',
)
ensure_action('Download menu opened', 'download_menu_opened')
ensure_action('Download platform selected', 'download_platform_selected')
a_download = ensure_action('Download started', 'download_started')
ensure_action('Download fallback used', 'download_fallback_used')
ensure_action('Docs clicked', 'docs_clicked')
ensure_action('GitHub clicked', 'github_clicked')
ensure_action('Discord clicked', 'discord_clicked')

traffic = ensure_dashboard(
    'OpenCoven · Traffic',
    'Explicit route events only; no autocapture, replay, or heatmaps',
)
conversion = ensure_dashboard(
    'OpenCoven · Conversion',
    'Explicit product, command, and download events',
)

if a_page:
    ensure_insight(
        'Page views and unique visitors',
        trends(events('page_viewed') + events('page_viewed', math='dau')),
        traffic,
    )
    ensure_insight(
        'Top routes',
        trends(
            events('page_viewed'),
            display='ActionsBarValue',
            breakdown='path',
        ),
        traffic,
    )

if a_download:
    ensure_insight(
        'Downloads over time',
        trends([action_node(a_download)]),
        conversion,
    )
    if a_page:
        ensure_insight(
            'Funnel: visit → download',
            funnel([action_node(a_page), action_node(a_download)]),
            conversion,
        )
if a_product:
    ensure_insight(
        'Product selections',
        trends([action_node(a_product)]),
        conversion,
    )
if a_copy:
    ensure_insight(
        'Quickstart command copies',
        trends([action_node(a_copy)]),
        conversion,
    )

print('\n'.join(REPORT))
fails = sum(1 for row in REPORT if row.startswith('FAIL'))
print(
    f'\n{len(REPORT)} steps · {fails} failed'
    + (' — fix the named schema drift and rerun' if fails else '')
)
sys.exit(1 if fails else 0)
