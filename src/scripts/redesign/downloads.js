// The download suite: platform-aware primary button, streaming with progress
// via the same-origin /stream proxy, tabbed platform menu with real release
// artifacts from /api/site-stats, copy-to-clipboard, and graceful fallbacks
// (proxy down or rate-limited → browser-native download of the pinned asset).

import { register } from './actions.js';

let dlBusy = false;
let dlReader = null;
let dlCancelled = false;
let dlAway = null;
let dlEsc = null;
let copyT = null;
const timers = [];

const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

export function fmtMB(bytes) {
  return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + ' MB';
}

function setDl(btn, state, info) {
  const q = (s) => btn.querySelector(s);
  const fill = q('[data-dl-fill]');
  const label = q('[data-dl-label]');
  const spin = q('[data-dl-spin]');
  const check = q('[data-dl-check]');
  const scope = btn.closest('[data-dl-scope]') || document;
  const status = scope.querySelector('[data-dl-status]');
  const caption = scope.querySelector('[data-dl-caption]');
  btn.dataset.dlState = state;

  if (spin) spin.style.display = state === 'connecting' ? 'block' : 'none';
  if (check) check.style.display = state === 'done' ? 'block' : 'none';
  if (caption) caption.style.display = state === 'idle' ? 'flex' : 'none';
  if (status) status.style.display = state === 'idle' ? 'none' : 'flex';
  const busy = state === 'connecting' || state === 'progress';
  btn.style.cursor = 'pointer';
  if (busy) btn.setAttribute('aria-busy', 'true');
  else btn.removeAttribute('aria-busy');

  if (state === 'connecting') {
    if (fill) fill.style.width = '0%';
    if (label) label.textContent = 'Preparing your download';
    if (status) { status.textContent = 'Contacting the release host'; status.style.color = 'var(--cv-text-muted)'; }
    return;
  }
  if (state === 'progress') {
    const pct = info.total ? Math.min(100, (info.got / info.total) * 100) : 0;
    if (fill) fill.style.width = pct.toFixed(1) + '%';
    if (label) label.textContent = info.total ? Math.round(pct) + '% · downloading' : 'downloading';
    if (status) {
      const secs = (Date.now() - info.t0) / 1000;
      const rate = secs > 0.35 ? info.got / secs : 0;
      const left = rate && info.total ? Math.max(0, (info.total - info.got) / rate) : 0;
      status.textContent = (info.total
          ? fmtMB(info.got) + ' / ' + fmtMB(info.total)
            + (left > 0.6 ? ' · ' + Math.ceil(left) + 's left' : ' · almost there')
          : fmtMB(info.got) + ' downloaded') + ' · click to cancel';
      status.style.color = 'var(--cv-text-secondary)';
    }
    return;
  }
  if (state === 'done') {
    if (fill) fill.style.width = '100%';
    if (label) label.textContent = 'Saved to your Downloads';
    if (status) {
      const named = btn.dataset.dlName || 'the disk image';
      status.textContent = 'Open ' + named + ' → drag Cave to Applications → run coven init in your repo';
      status.style.color = 'var(--cv-success)';
    }
    later(() => { dlBusy = false; setDl(btn, 'idle'); }, 11000);
    return;
  }
  if (state === 'error') {
    if (fill) fill.style.width = '0%';
    if (label) label.textContent = 'Retry download';
    if (status) { status.textContent = 'The connection dropped before the file finished'; status.style.color = 'var(--cv-danger)'; }
    dlBusy = false;
    return;
  }
  if (fill) fill.style.width = '0%';
  if (label) label.textContent = btn.dataset.dlLabel || 'Download Cave for macOS';
}

async function streamDownload(btn) {
  const t0 = Date.now();
  let started = false;
  try {
    const res = await fetch(btn.dataset.dlUrl);
    if (!res.ok || !res.body) throw new Error('no stream');
    // needs Access-Control-Expose-Headers: Content-Length on the release origin
    const total = Number(res.headers.get('Content-Length')) || Number(res.headers.get('X-File-Size')) || 0;
    const reader = res.body.getReader();
    dlReader = reader;
    const chunks = [];
    let got = 0;
    started = true;
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      chunks.push(step.value);
      got += step.value.length;
      setDl(btn, 'progress', { got, total, t0 });
    }
    dlReader = null;
    if (dlCancelled) {
      dlCancelled = false;
      dlBusy = false;
      setDl(btn, 'idle');
      return;
    }
    const href = URL.createObjectURL(new Blob(chunks, { type: 'application/octet-stream' }));
    const a = document.createElement('a');
    a.href = href;
    a.download = btn.dataset.dlName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    setDl(btn, 'done');
  } catch (err) {
    dlReader = null;
    if (dlCancelled) {
      dlCancelled = false;
      dlBusy = false;
      setDl(btn, 'idle');
      return;
    }
    if (started) { setDl(btn, 'error'); return; }
    // Streaming unavailable (CORS, proxy down, rate limit): hand the click to
    // the browser so the visitor still gets the real installer.
    dlBusy = false;
    setDl(btn, 'idle');
    location.assign(btn.dataset.dlHref || btn.dataset.dlUrl || '/download/mac');
  }
}

function startDownload(e) {
  const btn = e.currentTarget;
  if (dlBusy) {
    // second click cancels the in-flight stream
    if (dlReader) {
      dlCancelled = true;
      dlReader.cancel().catch(() => {});
    }
    return;
  }
  dlBusy = true;
  setDl(btn, 'connecting');
  streamDownload(btn);
}

function pickPlatform(e) {
  // the tab lives inside the menu, so the outside-click closer must not see this
  e.stopPropagation();
  const tab = e.currentTarget;
  const menu = tab.closest('[data-dl-menu]');
  const plat = tab.getAttribute('data-dl-plat');
  if (!menu) return;
  const paint = () => {
    menu.querySelectorAll('[data-dl-pane]').forEach((p) => {
      p.style.setProperty('display', p.getAttribute('data-dl-pane') === plat ? 'flex' : 'none', 'important');
    });
    menu.querySelectorAll('[data-dl-plat]').forEach((t) => {
      const on = t.getAttribute('data-dl-plat') === plat;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.style.setProperty('background', on ? 'var(--cv-bg-hover)' : 'transparent', 'important');
      t.style.setProperty('border-color', on ? 'color-mix(in oklch, var(--cv-accent) 45%, transparent)' : 'var(--cv-border-hairline)', 'important');
      t.style.setProperty('color', on ? 'var(--cv-text-primary)' : 'var(--cv-text-secondary)', 'important');
    });
  };
  paint();
  requestAnimationFrame(paint);
}

function setDownloads(open, only) {
  const menus = Array.from(document.querySelectorAll('[data-dl-menu]'));
  menus.filter((m) => m !== only).forEach((m) => {
    m.style.visibility = 'hidden';
    m.style.opacity = '0';
    m.style.transform = 'translateY(-6px)';
  });
  const menu = only || menus[0];
  if (!menu) return;
  menu.style.visibility = open ? 'visible' : 'hidden';
  menu.style.opacity = open ? '1' : '0';
  menu.style.transform = open ? 'none' : 'translateY(-6px)';
  if (open && !dlAway) {
    dlAway = (ev) => { if (!menu.contains(ev.target)) setDownloads(false); };
    dlEsc = (ev) => { if (ev.key === 'Escape') setDownloads(false); };
    document.addEventListener('click', dlAway);
    document.addEventListener('keydown', dlEsc);
  } else if (!open && dlAway) {
    document.removeEventListener('click', dlAway);
    document.removeEventListener('keydown', dlEsc);
    dlAway = null;
    dlEsc = null;
  }
}

function toggleDownloads(e) {
  e.stopPropagation();
  const wrap = e.currentTarget.parentElement;
  const menu = wrap ? wrap.querySelector('[data-dl-menu]') : null;
  if (!menu) return;
  const open = menu.style.visibility === 'visible';
  setDownloads(!open, menu);
}

function copy(e) {
  const btn = e.currentTarget;
  const text = btn.dataset.copy || '';
  const flash = () => {
    const label = btn.querySelector('[data-copy-label]');
    if (!label) return;
    if (!label.dataset.idle) label.dataset.idle = label.textContent;
    label.textContent = 'copied';
    label.style.opacity = '1';
    label.style.color = 'var(--cv-accent)';
    clearTimeout(copyT);
    copyT = setTimeout(() => {
      label.textContent = label.dataset.idle || 'copy';
      label.style.opacity = '';
      label.style.color = '';
    }, 1500);
  };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) { /* clipboard unavailable */ }
    document.body.removeChild(ta);
    flash();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(flash, fallback);
  } else {
    fallback();
  }
  // the how-it-works quickstart advances its step cards on copy
  const card = btn.closest ? btn.closest('[data-step-card]') : null;
  if (card) document.dispatchEvent(new CustomEvent('redesign:copystep', { detail: Number(card.dataset.stepCard) }));
}

// the pane region holds its tallest pane, measured rather than guessed — panes
// change height when assets resolve or the provenance block appears, and the
// tab row must not move
export function fitMenus() {
  document.querySelectorAll('[data-dl-panes]').forEach((wrap) => {
    let tallest = 0;
    wrap.querySelectorAll('[data-dl-pane]').forEach((pane) => {
      const prev = pane.getAttribute('style') || '';
      const hidden = getComputedStyle(pane).display === 'none';
      if (hidden) pane.style.setProperty('display', 'flex', 'important');
      tallest = Math.max(tallest, pane.offsetHeight);
      if (hidden) pane.setAttribute('style', prev);
    });
    if (tallest) wrap.style.minHeight = tallest + 'px';
  });
}

function detectOs() {
  // navigator.platform first: Chrome's UA reduction freezes the UA string
  // (and can freeze userAgentData) to Windows on every desktop OS
  const plat = navigator.platform || (navigator.userAgentData && navigator.userAgentData.platform) || navigator.userAgent || '';
  return /Win/i.test(plat) ? 'windows'
    : (/Linux|X11/i.test(plat) && !/Android/i.test(navigator.userAgent || '')) ? 'linux'
    : 'mac';
}

// asset names carry the version, so a fixed /latest/download/ path cannot stay
// current — the panel names a version in the markup and then rewrites itself
// from the newest release via the CDN-cached stats endpoint
export function loadArtifacts() {
  const SLOTS = [
    { slot: 'mac-arm64', match: /-aarch64\.dmg$/, cmd: (f) => 'shasum -a 256 ~/Downloads/' + f },
    { slot: 'mac-x64', match: /-x86_64\.dmg$/, cmd: (f) => 'shasum -a 256 ~/Downloads/' + f },
    { slot: 'win-x64', match: /_x64_.*\.msi$/, cmd: (f) => 'certutil -hashfile ' + f + ' SHA256' },
    { slot: 'linux-amd64', match: /_amd64\.AppImage$/, cmd: (f) => 'sha256sum ' + f },
  ];
  fetch('/api/site-stats')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const rel = d && d.release;
      const assets = (rel && rel.assets) || [];
      if (!assets.length) return;
      const tag = rel.tag_name || '';
      if (tag) document.querySelectorAll('[data-art-ver]').forEach((el) => { el.textContent = tag; });
      // the primary button hands out the visitor's platform build (Apple silicon by default)
      const os = detectOs();
      const primaryMatch = os === 'windows' ? /_x64_.*\.msi$/ : os === 'linux' ? /_amd64\.AppImage$/ : /-aarch64\.dmg$/;
      const primaryLabel = os === 'windows' ? 'Download Cave for Windows' : os === 'linux' ? 'Download Cave for Linux' : 'Download Cave for macOS';
      const primary = assets.find((a) => primaryMatch.test(a.name) && !/\.sig$/.test(a.name)) || assets.find((a) => /-aarch64\.dmg$/.test(a.name));
      if (primary) {
        document.querySelectorAll('[data-dl-btn]').forEach((btn) => {
          // stream same-origin so progress works (direct GitHub fetch dies on
          // CORS); keep the direct URL as the browser-navigation fallback
          btn.dataset.dlUrl = '/stream/' + os;
          btn.dataset.dlHref = primary.browser_download_url;
          btn.dataset.dlName = primary.name;
          btn.dataset.dlSize = String(primary.size);
          btn.dataset.dlLabel = primaryLabel;
          const l = btn.querySelector('[data-dl-label]');
          if (l && !btn.dataset.dlState) l.textContent = primaryLabel;
        });
      }
      // provenance answered server-side (cached attestation lookup)
      if (d && d.hasAttestation) {
        document.querySelectorAll('[data-art-prov-block]').forEach((el) => { el.style.display = 'flex'; });
        fitMenus();
      }
      SLOTS.forEach((spec) => {
        const asset = assets.find((a) => spec.match.test(a.name) && !/\.sig$/.test(a.name));
        const sig = asset && assets.find((a) => a.name === asset.name + '.sig');
        const digest = asset && typeof asset.digest === 'string' ? asset.digest : '';
        document.querySelectorAll('[data-art="' + spec.slot + '"]').forEach((row) => {
          if (!asset) { row.style.display = 'none'; return; }
          row.setAttribute('href', asset.browser_download_url);
          const f = row.querySelector('[data-art-file]');
          if (f) f.textContent = asset.name;
          const sz = row.querySelector('[data-art-size]');
          if (sz) sz.textContent = (asset.size / 1048576).toFixed(1).replace(/\.0$/, '') + ' MB';
        });
        document.querySelectorAll('[data-art-verify="' + spec.slot + '"]').forEach((btn) => {
          if (!asset) return;
          btn.setAttribute('data-copy', spec.cmd(asset.name));
          const h = btn.querySelector('[data-art-hash]');
          if (h && digest) h.textContent = digest.slice(0, digest.startsWith('sha256:') ? 24 : 17) + '…';
        });
        document.querySelectorAll('[data-art-sig="' + spec.slot + '"]').forEach((link) => {
          if (sig) link.setAttribute('href', sig.browser_download_url);
          else link.style.display = 'none';
        });
      });
    })
    .then(() => fitMenus())
    .catch(() => {});
}

// the primary button is authored for macOS; retarget it for the visitor's OS
// before the release data lands (and permanently if the stats API is down)
export function adaptPlatform() {
  const os = detectOs();
  if (os === 'mac') return;
  const label = os === 'windows' ? 'Download Cave for Windows' : 'Download Cave for Linux';
  const name = os === 'windows' ? 'Coven-Cave.msi' : 'Coven-Cave.AppImage';
  document.querySelectorAll('[data-dl-btn]').forEach((btn) => {
    if (btn.dataset.dlHref) return; // loadArtifacts already landed real data
    btn.setAttribute('data-dl-url', '/stream/' + os);
    btn.setAttribute('data-dl-name', name);
    if (!btn.dataset.dlLabel) btn.dataset.dlLabel = label;
    const l = btn.querySelector('[data-dl-label]');
    if (l && !btn.dataset.dlState) l.textContent = label;
  });
}

export function initDownloads() {
  register('startDownload', startDownload);
  register('toggleDownloads', toggleDownloads);
  register('pickPlatform', pickPlatform);
  register('copy', copy);
  adaptPlatform();
  loadArtifacts();
  setTimeout(fitMenus, 60);
}
