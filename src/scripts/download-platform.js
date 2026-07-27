// Shared visitor-platform detection for download CTAs.
//
// Stable download routes → direct installer files. A serverless function
// (api/download.js) resolves the latest release per request, so these
// paths never change and there's nothing to bump per release.
export const DOWNLOAD_ROUTES = {
  mac: '/download/mac',
  win: '/download/windows',
  linux: '/download/linux',
};

// Detection order:
//   1. UA-string OS markers (most intentional; matches UA overrides)
//   2. UA-Client-Hints `platform` (Chromium)
//   3. `navigator.platform` fallback
//   4. Default fallback: macOS
export function detectPlatform() {
  const ua = navigator.userAgent || '';
  const rawPlatform = (navigator.platform || '').toLowerCase();
  let uaPlatform = '';
  try {
    // UA-Client-Hints (Chromium-based browsers). High-entropy hints
    // would be more accurate but require a Permissions-Policy header;
    // the low-entropy 'platform' string is fine for our four buckets.
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      uaPlatform = String(navigator.userAgentData.platform).toLowerCase();
    }
  } catch {
    // Client hints unavailable — the fallbacks below still apply.
  }

  // iPad on iOS 13+ reports as Mac in UA + platform. Disambiguate
  // by checking for multi-touch capability (Macs report 0).
  const isIOSDevice =
    /iPhone|iPad|iPod/i.test(ua) ||
    (rawPlatform === 'macintel' && navigator.maxTouchPoints > 1);
  if (isIOSDevice) return 'ios';

  // The UA string is what dev tools / mobile sites set, and it's the most
  // intentional signal. Client hints + navigator.platform come from the OS
  // and can't always be overridden, so they go last.
  if (/Windows/i.test(ua)) return 'win';
  if (/Linux|X11|CrOS|Android/i.test(ua) && !/Mac/i.test(ua)) {
    // Android browsers report "Linux" too — we don't ship Android yet,
    // so steering them to the Linux/CLI path is the least-bad option.
    return 'linux';
  }
  if (/Mac OS X|Macintosh/i.test(ua)) return 'mac';
  if (uaPlatform.includes('win') || rawPlatform.includes('win')) return 'win';
  if (
    uaPlatform.includes('linux') ||
    rawPlatform.includes('linux') ||
    uaPlatform.includes('chromeos')
  ) {
    return 'linux';
  }
  return 'mac';
}
