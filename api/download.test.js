import test from 'node:test';
import assert from 'node:assert/strict';

import handler, { workerDownloadUrl } from './download.js';

function responseStub() {
  return {
    headers: new Map(),
    status: null,
    location: null,
    ended: false,
    setHeader(name, value) {
      this.headers.set(name, value);
    },
    writeHead(status, headers) {
      this.status = status;
      this.location = headers.Location;
    },
    end() {
      this.ended = true;
    },
  };
}

async function withEnv(values, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('workerDownloadUrl creates a clean platform route from a configured origin', () => {
  assert.equal(
    workerDownloadUrl('mac', 'https://downloads.opencoven.ai/?ignored=yes#fragment'),
    'https://downloads.opencoven.ai/mac',
  );
  assert.equal(workerDownloadUrl('mac', 'https://downloads.opencoven.ai/edge/'), null);
  assert.equal(workerDownloadUrl('linux', 'ftp://downloads.opencoven.ai'), null);
  assert.equal(workerDownloadUrl('linux', 'https://user:password@downloads.opencoven.ai'), null);
  assert.equal(workerDownloadUrl('linux', ''), null);
});

test('configured macOS downloads hand the browser-native route to the Worker', async () => {
  await withEnv(
    {
      DOWNLOAD_STREAM_ORIGIN: 'https://downloads.opencoven.ai',
      PUBLIC_DOWNLOAD_STREAM_ORIGIN: undefined,
    },
    async () => {
      const res = responseStub();
      await handler({ query: { platform: 'mac' } }, res);

      assert.equal(res.status, 302);
      assert.equal(res.location, 'https://downloads.opencoven.ai/mac');
      assert.equal(res.headers.get('Cache-Control'), 'no-store');
      assert.equal(res.ended, true);
    },
  );
});

test('Windows resolves the last available MSI when the latest release has none', async () => {
  await withEnv({ DOWNLOAD_STREAM_ORIGIN: 'https://downloads.opencoven.ai' }, async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url) => {
      calls.push(url);
      const assets = url.endsWith('/releases/latest')
        ? [{ name: 'CovenCave-v0.5.8-aarch64.dmg' }]
        : [{ name: 'CovenCave_0.5.7_x64_en-US.msi', browser_download_url: 'https://github.com/OpenCoven/coven-cave/releases/download/v0.5.7/CovenCave_0.5.7_x64_en-US.msi' }];
      return new Response(JSON.stringify({ assets }), { status: 200 });
    };
    try {
      const res = responseStub();
      await handler({ query: { platform: 'windows' } }, res);
      assert.equal(res.status, 302);
      assert.match(res.location, /v0\.5\.7\/CovenCave_0\.5\.7_x64_en-US\.msi$/);
      assert.ok(calls[1].endsWith('/releases/tags/v0.5.7'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('the compatibility PUBLIC origin alias works, while invalid configuration preserves the direct resolver', async () => {
  await withEnv(
    {
      DOWNLOAD_STREAM_ORIGIN: undefined,
      PUBLIC_DOWNLOAD_STREAM_ORIGIN: 'https://downloads.opencoven.ai/',
    },
    async () => {
      assert.equal(workerDownloadUrl('mac'), 'https://downloads.opencoven.ai/mac');
    },
  );

  await withEnv(
    {
      DOWNLOAD_STREAM_ORIGIN: 'ftp://downloads.opencoven.ai',
      PUBLIC_DOWNLOAD_STREAM_ORIGIN: undefined,
    },
    async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => new Response(JSON.stringify({ assets: [] }), { status: 200 });
      try {
        const res = responseStub();
        await handler({ query: { platform: 'mac' } }, res);
        assert.equal(res.status, 302);
        assert.equal(res.location, 'https://github.com/OpenCoven/coven-cave/releases/latest');
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});
