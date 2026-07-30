#!/usr/bin/env python3
"""Provision the PostHog workspace for the OpenCoven site: actions, funnels,
dashboards, and project settings, from posthog.config.json.

Idempotent: every object is looked up by name first — existing objects are
updated in place, so re-running after edits here is safe. Each item reports
ok/updated/FAILED and a failure never aborts the run, so schema drift in one
object type leaves the rest provisioned (fix or create the stragglers by hand
in the PostHog UI).

Requires: personalApiKey (scopes: action:write, insight:write,
dashboard:write, project:write), projectId, region in posthog.config.json.

Usage: python3 analytics/provision.py [--dry-run]
"""

import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

HERE = Path(__file__).parent
CFG = json.loads((HERE / 'posthog.config.json').read_text(encoding='utf-8'))
REGION = (CFG.get('region') or 'us').strip().lower()
# apiHost override supports self-hosted PostHog (and the mock-server test)
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
        headers={'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or 'null')


def paged(path):
    out, url = [], path
    while url:
        d = call('GET', url)
        out += d.get('results', [])
        url = d.get('next')
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
    except urllib.error.HTTPError as e:
        REPORT.append(f'FAIL  {kind}: {name} — HTTP {e.code}: {e.read()[:200]!r}')
    except Exception as e:  # noqa: BLE001 — report and continue is the contract
        REPORT.append(f'FAIL  {kind}: {name} — {e}')
    return None


def ensure_action(name, steps, description=''):
    def fn():
        existing = next((a for a in ACTIONS if a['name'] == name), None)
        body = {'name': name, 'steps': steps, 'description': description}
        if existing:
            return call('PATCH', f'/api/projects/{PID}/actions/{existing["id"]}/', body), 'ok'
        return call('POST', f'/api/projects/{PID}/actions/', body), 'new'
    return step('action', name, fn)


def ensure_dashboard(name, description=''):
    def fn():
        existing = next((d for d in DASHBOARDS if d['name'] == name), None)
        if existing:
            return existing, 'ok'
        return call('POST', f'/api/projects/{PID}/dashboards/', {'name': name, 'description': description}), 'new'
    return step('dashboard', name, fn)


def ensure_insight(name, query, dashboard):
    def fn():
        existing = next((i for i in INSIGHTS if i.get('name') == name), None)
        body = {'name': name, 'query': {'kind': 'InsightVizNode', 'source': query}, 'saved': True}
        if dashboard:
            body['dashboards'] = sorted(set((existing.get('dashboards') or []) if existing else []) | {dashboard['id']})
        if existing:
            return call('PATCH', f'/api/projects/{PID}/insights/{existing["id"]}/', body), 'ok'
        return call('POST', f'/api/projects/{PID}/insights/', body), 'new'
    return step('insight', name, fn)


def events(*names, math='total'):
    return [{'kind': 'EventsNode', 'event': n, 'name': n, 'math': math} for n in names]


def action_node(action, math='total'):
    return {'kind': 'ActionsNode', 'id': action['id'], 'name': action['name'], 'math': math}


def trends(series, display='ActionsLineGraph', breakdown=None, interval='day'):
    q = {'kind': 'TrendsQuery', 'series': series, 'interval': interval,
         'trendsFilter': {'display': display}}
    if breakdown:
        q['breakdownFilter'] = {'breakdown': breakdown, 'breakdown_type': 'event'}
    return q


def funnel(series):
    return {'kind': 'FunnelsQuery', 'series': series,
            'funnelsFilter': {'funnelWindowInterval': 1, 'funnelWindowIntervalUnit': 'day'}}


if not DRY and not (TOKEN and PID):
    sys.exit('posthog: fill personalApiKey and projectId in posthog.config.json first')

ACTIONS = [] if DRY else paged(f'/api/projects/{PID}/actions/')
DASHBOARDS = [] if DRY else paged(f'/api/projects/{PID}/dashboards/')
INSIGHTS = [] if DRY else paged(f'/api/projects/{PID}/insights/?saved=true&limit=300')

# ── project settings: replay, heatmaps, web vitals, toolbar domain ──
step('project', 'settings (replay · heatmaps · web vitals · toolbar URL)', lambda: (
    call('PATCH', f'/api/projects/{PID}/', {
        'session_recording_opt_in': True,
        'heatmaps_opt_in': True,
        'autocapture_web_vitals_opt_in': True,
        'app_urls': sorted(set((call('GET', f'/api/projects/{PID}/').get('app_urls') or []) + [SITE])),
    }), 'ok'))

# ── actions (durable names for the site's meaningful clicks) ──
sel = lambda s: [{'event': '$autocapture', 'selector': s}]
a_download = ensure_action('Download clicked', sel('[data-dl-btn]'),
                           'Primary download button, any platform (platform in data-dl-name)')
ensure_action('Artifact: Windows (.msi)', sel('[data-art="win-x64"]'))
ensure_action('Artifact: macOS Apple silicon (.dmg)', sel('[data-art="mac-arm64"]'))
ensure_action('Artifact: macOS Intel (.dmg)', sel('[data-art="mac-x64"]'))
ensure_action('Artifact: Linux (.AppImage)', sel('[data-art="linux-amd64"]'))
a_copy = ensure_action('Install command copied', sel('[data-copy]'))
ensure_action('See it hold a claim', [{'event': '$autocapture', 'text': 'See it hold a claim →'}])
a_hiw = ensure_action('How it works viewed', [{'event': '$pageview', 'url': '/how-it-works', 'url_matching': 'contains'}])
ensure_action('Outbound: GitHub', sel('a[href*="github.com"]'))
ensure_action('Outbound: Discord', sel('a[href*="discord.gg"]'))

# ── dashboards ──
d_traffic = ensure_dashboard('OpenCoven · Traffic', 'Visitors, sources, devices, geography')
d_conv = ensure_dashboard('OpenCoven · Conversion', 'Downloads, funnels, engagement')

# ── traffic insights ──
ensure_insight('Pageviews and unique visitors',
               trends(events('$pageview') + events('$pageview', math='dau')), d_traffic)
ensure_insight('Top referrers',
               trends(events('$pageview'), display='ActionsBarValue', breakdown='$referring_domain'), d_traffic)
ensure_insight('Device type',
               trends(events('$pageview', math='dau'), display='ActionsPie', breakdown='$device_type'), d_traffic)
ensure_insight('Countries',
               trends(events('$pageview', math='dau'), display='WorldMap', breakdown='$geoip_country_code'), d_traffic)
ensure_insight('Browser',
               trends(events('$pageview', math='dau'), display='ActionsBarValue', breakdown='$browser'), d_traffic)

# ── conversion insights ──
if a_download:
    ensure_insight('Downloads over time', trends([action_node(a_download)]), d_conv)
    ensure_insight('Funnel: visit → download',
                   funnel(events('$pageview') + [action_node(a_download)]), d_conv)
    if a_hiw:
        ensure_insight('Funnel: visit → how it works → download',
                       funnel(events('$pageview') + [action_node(a_hiw), action_node(a_download)]), d_conv)
if a_copy:
    ensure_insight('Install command copies', trends([action_node(a_copy)]), d_conv)

print('\n'.join(REPORT))
fails = sum(1 for r in REPORT if r.startswith('FAIL'))
print(f'\n{len(REPORT)} steps · {fails} failed' + (' — fix the stragglers in the PostHog UI or rerun' if fails else ''))
sys.exit(1 if fails else 0)
