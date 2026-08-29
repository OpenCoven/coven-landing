import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import worker, {
  MATCHERS,
  corsFor,
  parseAllowedOrigins,
  pickAsset,
} from '../src/index.js';

const RELEASE_ASSETS = [
  { name: 'CovenCave-v0.1.6-aarch64.app.tar.gz', browser_download_url: 'https://gh/aarch64.app.tar.gz' },
  { name: 'CovenCave-v0.1.6-aarch64.dmg.sig', browser_download_url: 'https://gh/aarch64.dmg.sig' },
  { name: 'CovenCave-v0.1.6-aarch64.dmg', browser_download_url: 'https://gh/aarch64.dmg', size: 76901698 },
  { name: 'CovenCave-v0.1.6-x86_64.dmg', browser_download_url: 'https://gh/x86_64.dmg' },
  { name: 'CovenCave_0.1.6_x64.msi', browser_download_url: 'https://gh/x64.msi' },
  { name: 'CovenCave_0.1.6_amd64.AppImage', browser_download_url: 'https://gh/amd64.AppImage' },
];

const ENV = {
  ALLOWED_ORIGINS:
    'https://opencoven.ai,https://*.vercel.app,http://localhost:*',
};

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function stubGitHub({ assetBytes = new Uint8Array(64).fill(7) } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('https://api.github.com/')) {
      return new Response(JSON.stringify({ assets: RELEASE_ASSETS }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(assetBytes, {
      status: 200,
      headers: { 'Content-Length': String(assetBytes.length) },
    });
  };
  return calls;
}

describe('pickAsset', () => {
  it('selects per-platform installers and skips .sig sidecars', () => {
    assert.equal(
      pickAsset(RELEASE_ASSETS, 'mac')?.name,
      'CovenCave-v0.1.6-aarch64.dmg',
    );
    assert.equal(
      pickAsset(RELEASE_ASSETS, 'mac-intel')?.name,
      'CovenCave-v0.1.6-x86_64.dmg',
    );
    assert.equal(pickAsset(RELEASE_ASSETS, 'windows')?.name, 'CovenCave_0.1.6_x64.msi');
    assert.equal(
      pickAsset(RELEASE_ASSETS, 'linux')?.name,
      'CovenCave_0.1.6_amd64.AppImage',
    );
    assert.equal(pickAsset(RELEASE_ASSETS, 'solaris'), null);
    assert.equal(pickAsset(undefined, 'mac'), null);
  });

  it('covers every advertised platform', () => {
    for (const platform of Object.keys(MATCHERS)) {
      assert.ok(pickAsset(RELEASE_ASSETS, platform), `no asset for ${platform}`);
    }
  });
});

describe('origin allowlist', () => {
  const allowed = parseAllowedOrigins(ENV.ALLOWED_ORIGINS);

  it('reflects exact, wildcard-subdomain, and wildcard-port origins', () => {
    for (const origin of [
      'https://opencoven.ai',
      'https://coven-landing-git-main.vercel.app',
      'http://localhost:4321',
    ]) {
      assert.equal(
        corsFor(origin, allowed)['Access-Control-Allow-Origin'],
        origin,
      );
    }
  });

  it('exposes the headers the progress UI needs', () => {
    assert.equal(
      corsFor('https://opencoven.ai', allowed)['Access-Control-Expose-Headers'],
      'Content-Length, Content-Disposition, X-File-Size',
    );
  });

  it('denies unlisted origins and missing origins', () => {
    for (const origin of [
      'https://evil.example',
      'https://opencoven.ai.evil.example',
      'http://opencoven.ai',
      '',
    ]) {
      assert.deepEqual(corsFor(origin, allowed), {});
    }
  });
});

describe('fetch handler', () => {
  it('streams the resolved asset with CORS + Content-Length', async () => {
    stubGitHub();
    const response = await worker.fetch(
      new Request('https://dl.example/mac', {
        headers: { Origin: 'https://opencoven.ai' },
      }),
      ENV,
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get('Access-Control-Allow-Origin'),
      'https://opencoven.ai',
    );
    assert.equal(response.headers.get('Content-Length'), '64');
    assert.equal(response.headers.get('X-File-Size'), '76901698');
    assert.equal(
      response.headers.get('Content-Disposition'),
      'attachment; filename="CovenCave-v0.1.6-aarch64.dmg"',
    );
    assert.equal((await response.arrayBuffer()).byteLength, 64);
  });

  it('redirects unknown platforms to the releases page', async () => {
    stubGitHub();
    const response = await worker.fetch(
      new Request('https://dl.example/solaris'),
      ENV,
    );
    assert.equal(response.status, 302);
    assert.match(response.headers.get('Location') ?? '', /releases\/latest$/);
  });

  it('redirects to the releases page when GitHub errors', async () => {
    globalThis.fetch = async () => new Response('rate limited', { status: 403 });
    const response = await worker.fetch(
      new Request('https://dl.example/mac'),
      ENV,
    );
    assert.equal(response.status, 302);
  });

  it('answers preflight for allowed origins', async () => {
    const response = await worker.fetch(
      new Request('https://dl.example/mac', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:4321' },
      }),
      ENV,
    );
    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get('Access-Control-Allow-Origin'),
      'http://localhost:4321',
    );
    assert.match(
      response.headers.get('Access-Control-Allow-Methods') ?? '',
      /GET/,
    );
  });

  it('rejects mutating methods', async () => {
    const response = await worker.fetch(
      new Request('https://dl.example/mac', { method: 'POST' }),
      ENV,
    );
    assert.equal(response.status, 405);
  });
});
