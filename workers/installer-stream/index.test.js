// Unit tests for the installer-stream Worker — run with `node --test`
// (see the test:unit script; no extra test framework, Node ships one).
//
// Node 24 speaks the same fetch/Request/Response dialect as workerd, so the
// handler is exercised directly: GitHub and the release asset are stubbed at
// the global fetch boundary, and every CORS/redirect/streaming contract the
// client cascade relies on is asserted here.

import test from 'node:test';
import assert from 'node:assert/strict';

import worker, {
  handleRequest,
  pickAsset,
  allowedOrigins,
  fallbackUrl,
  clearReleaseCache,
} from './src/index.js';

const RELEASES_PAGE = 'https://github.com/OpenCoven/coven-cave/releases/latest';
const ASSET_URL =
  'https://github.com/OpenCoven/coven-cave/releases/download/v0.2.1/CovenCave-v0.2.1-aarch64.dmg';

const RELEASE = {
  tag_name: 'v0.2.1',
  assets: [
    { name: 'CovenCave-v0.2.1-aarch64.dmg', size: 101083545, browser_download_url: ASSET_URL },
    { name: 'CovenCave-v0.2.1-aarch64.dmg.sig', size: 512, browser_download_url: ASSET_URL + '.sig' },
    { name: 'CovenCave-v0.2.1-x86_64.dmg', size: 104093859, browser_download_url: ASSET_URL.replace('aarch64', 'x86_64') },
    { name: 'CovenCave_0.2.1_x64_en-US.msi', size: 98671616, browser_download_url: ASSET_URL.replace('CovenCave-v0.2.1-aarch64.dmg', 'CovenCave_0.2.1_x64_en-US.msi') },
    { name: 'CovenCave_0.2.1_amd64.AppImage', size: 208668672, browser_download_url: ASSET_URL.replace('CovenCave-v0.2.1-aarch64.dmg', 'CovenCave_0.2.1_amd64.AppImage') },
  ],
};

const realFetch = globalThis.fetch;

// Install a fetch stub that answers the GitHub API with `release` and the
// asset URL with `asset` (a Response, or null to let the caller record calls
// and answer itself). Returns the array of observed calls.
function stubFetch({ release = RELEASE, asset, apiStatus = 200 }) {
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, init });
    if (url.startsWith('https://api.github.com/')) {
      return new Response(
        apiStatus === 200 ? JSON.stringify(release) : 'nope',
        { status: apiStatus, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (asset !== undefined) return asset;
    throw new Error(`unexpected fetch: ${url}`);
  };
  return calls;
}

test.afterEach(() => {
  globalThis.fetch = realFetch;
  clearReleaseCache();
});

const get = (path, headers = {}) =>
  handleRequest(new Request('https://worker.test' + path, { headers }), {});

test('pickAsset selects exactly one installer per platform', () => {
  for (const [platform, expected] of [
    ['mac', 'CovenCave-v0.2.1-aarch64.dmg'],
    ['mac-intel', 'CovenCave-v0.2.1-x86_64.dmg'],
    ['windows', 'CovenCave_0.2.1_x64_en-US.msi'],
    ['linux', 'CovenCave_0.2.1_amd64.AppImage'],
  ]) {
    const asset = pickAsset(RELEASE.assets, platform);
    assert.equal(asset && asset.name, expected, platform);
  }
});

test('pickAsset never returns .sig sidecars or unknown platforms', () => {
  assert.equal(pickAsset([{ name: 'CovenCave-v0.2.1-aarch64.dmg.sig' }], 'mac'), null);
  assert.equal(pickAsset(RELEASE.assets, 'freebsd'), null);
  assert.equal(pickAsset(RELEASE.assets, ''), null);
  assert.equal(pickAsset(undefined, 'mac'), null);
  assert.equal(pickAsset([{ name: 'readme.txt' }], 'mac'), null);
});

test('streams the installer body straight through with download headers', async () => {
  stubFetch({
    asset: new Response('INSTALLER-BYTES', {
      status: 200,
      headers: { 'Content-Length': '15' },
    }),
  });
  const res = await get('/mac', { Origin: 'https://opencoven.ai' });

  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'INSTALLER-BYTES');
  assert.equal(res.headers.get('Content-Type'), 'application/octet-stream');
  assert.equal(res.headers.get('Content-Disposition'), 'attachment; filename="CovenCave-v0.2.1-aarch64.dmg"');
  assert.equal(res.headers.get('Content-Length'), '15');
  assert.equal(res.headers.get('X-File-Size'), '101083545');
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=600');
  assert.ok(res.body instanceof ReadableStream);
});

test('passes the stream through without waiting for the upstream to finish', async () => {
  // An upstream that never closes: a buffering proxy would hang here, because
  // it would have to collect the whole body before answering.
  let releaseStream;
  stubFetch({
    asset: new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('first bytes'));
          releaseStream = controller; // never closed
        },
      }),
      { status: 200 },
    ),
  });
  const res = await get('/mac');
  assert.equal(res.status, 200);

  const reader = res.body.getReader();
  const first = await reader.read();
  assert.equal(new TextDecoder().decode(first.value), 'first bytes');
  await reader.cancel();
});

test('exposes progress headers to the allowlisted origin only, by exact match', async () => {
  stubFetch({ asset: new Response('x', { status: 200 }) });

  const allowed = await get('/mac', { Origin: 'https://opencoven.ai' });
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://opencoven.ai');
  assert.equal(
    allowed.headers.get('Access-Control-Expose-Headers'),
    'Content-Length, Content-Disposition, X-File-Size',
  );

  // subdomain/host tricks must not ride on an allowlisted suffix
  const lookalike = await get('/mac', { Origin: 'https://opencoven.ai.evil.test' });
  assert.equal(lookalike.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await lookalike.text()), 'x', 'non-browser clients still get the bytes');

  const noOrigin = await get('/mac');
  assert.equal(noOrigin.headers.get('Access-Control-Allow-Origin'), null);
});

test('preflight answers 204 for allowed origins and 403 otherwise', async () => {
  stubFetch({});
  const ok = await handleRequest(
    new Request('https://worker.test/mac', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:4321', 'Access-Control-Request-Method': 'GET' },
    }),
    {},
  );
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'http://localhost:4321');
  assert.equal(ok.headers.get('Access-Control-Allow-Methods'), 'GET, OPTIONS');

  const denied = await handleRequest(
    new Request('https://worker.test/mac', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.test', 'Access-Control-Request-Method': 'GET' },
    }),
    {},
  );
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null);
});

test('ALLOWED_ORIGINS var replaces the default allowlist, comma separated', () => {
  assert.ok(allowedOrigins({}).includes('https://opencoven.ai'));
  assert.deepEqual(allowedOrigins({ ALLOWED_ORIGINS: ' https://a.test,https://b.test ' }), [
    'https://a.test',
    'https://b.test',
  ]);
  assert.deepEqual(allowedOrigins({ ALLOWED_ORIGINS: '' }), allowedOrigins({}));
});

test('upstream failures use the configured Vercel stream fallback, with safe origin handling', async () => {
  assert.equal(
    fallbackUrl('linux', { FALLBACK_ORIGIN: 'https://opencoven.ai/site/?ignored=yes' }),
    'https://opencoven.ai/stream/linux',
  );
  assert.equal(fallbackUrl('linux', { FALLBACK_ORIGIN: 'ftp://opencoven.ai' }), null);

  stubFetch({ apiStatus: 503 });
  const res = await get('/linux');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), RELEASES_PAGE);

  const configured = await handleRequest(
    new Request('https://worker.test/linux'),
    { FALLBACK_ORIGIN: 'https://opencoven.ai' },
  );
  assert.equal(configured.status, 302);
  assert.equal(configured.headers.get('Location'), 'https://opencoven.ai/stream/linux');
});

test('unknown platforms and upstream failures redirect to GitHub Releases', async () => {
  stubFetch({});

  const unknown = await get('/freebsd');
  assert.equal(unknown.status, 302);
  assert.equal(unknown.headers.get('Location'), RELEASES_PAGE);
  assert.equal(unknown.headers.get('Cache-Control'), 'no-store');

  const rateLimited = await get('/mac', {});
  assert.equal(rateLimited.status, 302, 'GitHub API failure must degrade to the releases page');
  assert.equal(rateLimited.headers.get('Location'), RELEASES_PAGE);
});

test('missing assets and failed asset fetches redirect to GitHub Releases', async () => {
  stubFetch({
    release: { tag_name: 'v0.2.1', assets: [{ name: 'readme.txt', size: 10 }] },
  });
  const noAsset = await get('/mac');
  assert.equal(noAsset.status, 302);
  assert.equal(noAsset.headers.get('Location'), RELEASES_PAGE);

  stubFetch({ asset: new Response('forbidden', { status: 403 }) });
  const upstreamFail = await get('/mac');
  assert.equal(upstreamFail.status, 302);
  assert.equal(upstreamFail.headers.get('Location'), RELEASES_PAGE);
});

test('release metadata is cached per isolate within the TTL', async () => {
  const calls = stubFetch({ asset: new Response('x', { status: 200 }) });

  await get('/mac');
  await get('/mac');
  await get('/windows');
  assert.equal(
    calls.filter((c) => c.url.startsWith('https://api.github.com/')).length,
    1,
    'warm requests must not hit the GitHub API again',
  );

  clearReleaseCache();
  await get('/mac');
  assert.equal(
    calls.filter((c) => c.url.startsWith('https://api.github.com/')).length,
    2,
    'a cleared/expired cache re-resolves the release',
  );
});

test('RELEASE_TTL_MS=0 disables the memo (and GITHUB_TOKEN is forwarded)', async () => {
  const calls = stubFetch({ asset: new Response('x', { status: 200 }) });
  const env = { RELEASE_TTL_MS: '0', GITHUB_TOKEN: 'test-token' };

  await handleRequest(new Request('https://worker.test/mac'), env);
  await handleRequest(new Request('https://worker.test/mac'), env);

  const apiCalls = calls.filter((c) => c.url.startsWith('https://api.github.com/'));
  assert.equal(apiCalls.length, 2);
  assert.equal(apiCalls[0].init.headers.Authorization, 'Bearer test-token');
});

test('Content-Disposition cannot be smuggled through the asset filename', async () => {
  stubFetch({
    release: {
      tag_name: 'v0.2.1',
      assets: [{ name: 'we"ird\r\nX-Evil: 1-aarch64.dmg', size: 5, browser_download_url: ASSET_URL }],
    },
    asset: new Response('x', { status: 200 }),
  });
  const res = await get('/mac', { Origin: 'https://opencoven.ai' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('X-Evil'), null);
  assert.equal(res.headers.get('Content-Disposition'), 'attachment; filename="weirdX-Evil: 1-aarch64.dmg"');
});

test('non-GET methods are rejected with 405', async () => {
  const res = await handleRequest(new Request('https://worker.test/mac', { method: 'POST' }), {});
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'GET, OPTIONS');
});

test('the default export wires handleRequest as the Workers fetch handler', async () => {
  stubFetch({ asset: new Response('x', { status: 200 }) });
  const res = await worker.fetch(new Request('https://worker.test/mac'), {}, {});
  assert.equal(res.status, 200);
});
