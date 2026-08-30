import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const snippetPath = path.join(
  root,
  'src/components/redesign/PosthogSnippet.astro',
);
const provisionerPath = path.join(root, 'analytics/provision.py');
const readmePath = path.join(root, 'analytics/README.md');

const [snippet, provisioner, readme] = await Promise.all([
  readFile(snippetPath, 'utf8'),
  readFile(provisionerPath, 'utf8'),
  readFile(readmePath, 'utf8'),
]);

const requiredSnippetContracts = [
  'PUBLIC_POSTHOG_MODE',
  "rawMode !== 'off' && rawMode !== 'events'",
  "mode === 'events' && Boolean(key)",
  'autocapture: false',
  'capture_pageview: false',
  'capture_pageleave: false',
  'capture_heatmaps: false',
  'capture_exceptions: false',
  'disable_session_recording: true',
  "session_recording: { enabled: false",
  "quickstart_command_copied: { command_id: id }",
  "analytics.capture('page_viewed', { path: window.location.pathname })",
];
for (const contract of requiredSnippetContracts) {
  if (!snippet.includes(contract)) {
    throw new Error(`Analytics snippet is missing required contract: ${contract}`);
  }
}

const forbiddenSnippetContracts = [
  'autocapture: true',
  'capture_pageview: true',
  'capture_pageleave: true',
  'capture_heatmaps: true',
  'capture_exceptions: true',
  'disable_session_recording: false',
  'session_recording: { enabled: true',
];
for (const contract of forbiddenSnippetContracts) {
  if (snippet.includes(contract)) {
    throw new Error(`Analytics snippet enables forbidden launch behavior: ${contract}`);
  }
}

for (const contract of [
  "'session_recording_opt_in': False",
  "'heatmaps_opt_in': False",
  "'autocapture_web_vitals_opt_in': False",
]) {
  if (!provisioner.includes(contract)) {
    throw new Error(`PostHog provisioner is missing disabled project setting: ${contract}`);
  }
}
for (const forbidden of ["'$autocapture'", "'$pageview'"]) {
  if (provisioner.includes(forbidden)) {
    throw new Error(
      `PostHog provisioner retains broad capture event ${forbidden}; use explicit events only`,
    );
  }
}

for (const statement of [
  'analytics-off by default',
  'No PostHog script is emitted',
  'autocapture, heatmaps, exception capture, page-leave',
  'never command text',
]) {
  if (!readme.includes(statement)) {
    throw new Error(`Analytics documentation is missing public operating rule: ${statement}`);
  }
}

// CI builds without analytics credentials. In that default configuration no
// public route may contain the PostHog bootstrap or the approved client wrapper.
for (const route of [
  'index.html',
  path.join('how-it-works', 'index.html'),
  path.join('privacy', 'index.html'),
  path.join('terms', 'index.html'),
]) {
  const built = path.join(root, 'dist', route);
  if (!existsSync(built)) continue;
  const html = await readFile(built, 'utf8');
  for (const marker of ['window.posthog', 'opencovenAnalytics', 'posthog.init']) {
    if (html.includes(marker)) {
      throw new Error(
        `Default analytics-off build unexpectedly emitted ${marker} in dist/${route}`,
      );
    }
  }
}

console.log(
  'Verified analytics-off default, explicit event mode, bounded payload schema, and replay/heatmap/autocapture disablement.',
);
