// Browser-native Cave downloads plus a progressively enhanced artifact chooser.
//
// The page never fetches installer bytes. The primary link points at the
// same-origin /download/:platform resolver, which redirects the browser's own
// download manager to the allowlisted current release asset. JavaScript only
// adapts the platform label, manages the disclosure/tabs, copies verification
// commands, and decorates the static fallback with small JSON release metadata.

import { register } from './actions.js';

let activeMenu = null;
let activeToggle = null;
let copyTimer = null;

const PLATFORM = {
  mac: {
    label: 'Download Cave for macOS',
    route: '/download/mac',
  },
  windows: {
    label: 'Download Cave for Windows',
    route: '/download/windows',
  },
  linux: {
    label: 'Download Cave for Linux',
    route: '/download/linux',
  },
};

const SLOTS = [
  {
    slot: 'mac-arm64',
    match: /-aarch64\.dmg$/,
    command: (file) => `shasum -a 256 ~/Downloads/${file}`,
  },
  {
    slot: 'mac-x64',
    match: /-x86_64\.dmg$/,
    command: (file) => `shasum -a 256 ~/Downloads/${file}`,
  },
  {
    slot: 'win-x64',
    match: /_x64_.*\.msi$/,
    command: (file) => `certutil -hashfile ${file} SHA256`,
  },
  {
    slot: 'linux-amd64',
    match: /_amd64\.AppImage$/,
    command: (file) => `sha256sum ${file}`,
  },
];

function capture(name, properties) {
  try {
    window.opencovenAnalytics?.capture(name, properties);
  } catch {
    // Analytics is optional and can never block a download or disclosure.
  }
}

export function detectOs() {
  // navigator.platform first: Chromium's reduced UA can report Windows on a
  // non-Windows host, while platform remains useful for this coarse label.
  const platform =
    navigator.platform
    || (navigator.userAgentData && navigator.userAgentData.platform)
    || navigator.userAgent
    || '';
  if (/Win/i.test(platform)) return 'windows';
  if (/Linux|X11/i.test(platform) && !/Android/i.test(navigator.userAgent || '')) {
    return 'linux';
  }
  return 'mac';
}

function platformConfig(os) {
  return PLATFORM[os] || PLATFORM.mac;
}

export function adaptPlatform() {
  const os = detectOs();
  const config = platformConfig(os);
  document.querySelectorAll('[data-dl-btn]').forEach((link) => {
    link.setAttribute('href', config.route);
    link.setAttribute('data-dl-platform', os);
    link.setAttribute('data-dl-label', config.label);
    const label = link.querySelector('[data-dl-label]');
    if (label) label.textContent = config.label;
  });
}

function paintMenu(menu, open) {
  menu.hidden = !open;
  menu.style.visibility = open ? 'visible' : 'hidden';
  menu.style.opacity = open ? '1' : '0';
  menu.style.transform = open ? 'none' : 'translateY(-6px)';
}

function closeDownloads({ restoreFocus = false } = {}) {
  if (!activeMenu) return;
  const menu = activeMenu;
  const toggle = activeToggle;
  activeMenu = null;
  activeToggle = null;
  paintMenu(menu, false);
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus && toggle && document.contains(toggle)) toggle.focus();
}

function openDownloads(menu, toggle) {
  if (activeMenu && activeMenu !== menu) closeDownloads();
  activeMenu = menu;
  activeToggle = toggle;
  paintMenu(menu, true);
  toggle.setAttribute('aria-expanded', 'true');
  capture('download_menu_opened');
}

function toggleDownloads(event) {
  event.preventDefault();
  event.stopPropagation();
  const toggle = event.currentTarget;
  const wrap = toggle.closest('[data-r~="dlwrap"]') || toggle.parentElement;
  const menu = wrap && wrap.querySelector('[data-dl-menu]');
  if (!menu) return;
  if (activeMenu === menu && !menu.hidden) closeDownloads({ restoreFocus: true });
  else openDownloads(menu, toggle);
}

function selectPlatform(menu, platform, { focus = false, report = true } = {}) {
  const tabs = Array.from(menu.querySelectorAll('[data-dl-plat]'));
  const panels = Array.from(menu.querySelectorAll('[data-dl-pane]'));
  const selectedTab = tabs.find((tab) => tab.dataset.dlPlat === platform);
  if (!selectedTab) return;

  tabs.forEach((tab) => {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
    tab.style.background = selected ? 'var(--cv-bg-hover)' : 'transparent';
    tab.style.borderColor = selected
      ? 'color-mix(in oklch, var(--cv-accent) 45%, transparent)'
      : 'var(--cv-border-hairline)';
    tab.style.color = selected
      ? 'var(--cv-text-primary)'
      : 'var(--cv-text-secondary)';
  });

  panels.forEach((panel) => {
    const selected = panel.dataset.dlPane === platform;
    panel.hidden = !selected;
    panel.style.display = selected ? 'flex' : 'none';
  });

  if (focus) selectedTab.focus();
  if (report) capture('download_platform_selected', { platform });
}

function pickPlatform(event) {
  event.preventDefault();
  event.stopPropagation();
  const tab = event.currentTarget;
  const menu = tab.closest('[data-dl-menu]');
  if (!menu) return;
  selectPlatform(menu, tab.dataset.dlPlat);
}

function onTabKeydown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const tab = event.currentTarget;
  const menu = tab.closest('[data-dl-menu]');
  if (!menu) return;
  const tabs = Array.from(menu.querySelectorAll('[data-dl-plat]'));
  const current = tabs.indexOf(tab);
  if (current < 0) return;

  event.preventDefault();
  let next = current;
  if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
  if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  selectPlatform(menu, tabs[next].dataset.dlPlat, { focus: true });
}

function copiedFeedback(button) {
  const label = button.querySelector('[data-copy-label]');
  if (!label) return;
  if (!label.dataset.idle) label.dataset.idle = label.textContent || 'copy';
  label.textContent = 'copied';
  label.style.opacity = '1';
  label.style.color = 'var(--cv-accent)';
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    label.textContent = label.dataset.idle || 'copy';
    label.style.opacity = '';
    label.style.color = '';
  }, 1500);
}

function legacyCopy(text, button) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.inset = '-1000px auto auto -1000px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    textarea.remove();
  }
  copiedFeedback(button);
}

function copy(event) {
  const button = event.currentTarget;
  const text = button.dataset.copy || '';
  if (!text) return;
  const done = () => copiedFeedback(button);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => legacyCopy(text, button));
  } else {
    legacyCopy(text, button);
  }
  capture('quickstart_command_copied', {
    command_id: button.dataset.commandId || button.dataset.artVerify || 'install',
  });

  const card = button.closest('[data-step-card]');
  if (card) {
    document.dispatchEvent(
      new CustomEvent('redesign:copystep', {
        detail: Number(card.dataset.stepCard),
      }),
    );
  }
}

function formatSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `${(value / 1048576).toFixed(1).replace(/\.0$/, '')} MB`;
}

function setVisible(element, visible, display = '') {
  if (!element) return;
  element.hidden = !visible;
  element.style.display = visible ? display : 'none';
}

function decorateSlot(spec, assets) {
  const asset = assets.find(
    (candidate) =>
      candidate
      && typeof candidate.name === 'string'
      && !candidate.name.endsWith('.sig')
      && spec.match.test(candidate.name),
  );
  const signature = asset
    && assets.find((candidate) => candidate.name === `${asset.name}.sig`);
  const digest = asset && typeof asset.digest === 'string' ? asset.digest : '';

  document.querySelectorAll(`[data-art="${spec.slot}"]`).forEach((row) => {
    if (!asset || !asset.browser_download_url) {
      // The static row remains a truthful link to the latest releases page.
      return;
    }
    row.setAttribute('href', asset.browser_download_url);
    const filename = row.querySelector('[data-art-file]');
    if (filename) filename.textContent = asset.name;
    const size = row.querySelector('[data-art-size]');
    if (size) size.textContent = formatSize(asset.size) || 'current release';
  });

  document
    .querySelectorAll(`[data-art-verify="${spec.slot}"]`)
    .forEach((button) => {
      if (!asset || !digest) {
        setVisible(button, false);
        return;
      }
      button.dataset.copy = spec.command(asset.name);
      button.dataset.commandId = `verify-${spec.slot}`;
      const hash = button.querySelector('[data-art-hash]');
      if (hash) {
        const normalized = digest.startsWith('sha256:') ? digest : `sha256:${digest}`;
        hash.textContent = `${normalized.slice(0, 24)}…`;
      }
      setVisible(button, true, 'flex');
    });

  document.querySelectorAll(`[data-art-sig="${spec.slot}"]`).forEach((link) => {
    if (!signature || !signature.browser_download_url) {
      setVisible(link, false);
      return;
    }
    link.setAttribute('href', signature.browser_download_url);
    setVisible(link, true, 'inline-flex');
  });
}

export function loadArtifacts() {
  fetch('/api/site-stats')
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      const release = data && data.release;
      const assets = (release && release.assets) || [];
      if (!Array.isArray(assets) || !assets.length) return;
      if (release.tag_name) {
        document.querySelectorAll('[data-art-ver]').forEach((element) => {
          element.textContent = release.tag_name;
        });
      }
      SLOTS.forEach((spec) => decorateSlot(spec, assets));
      if (data.hasAttestation) {
        document.querySelectorAll('[data-art-prov-block]').forEach((block) => {
          setVisible(block, true, 'block');
        });
      }
    })
    .catch(() => {
      // Static latest-release links remain usable when metadata is unavailable.
    });
}

function initializeDownloadControls() {
  document.querySelectorAll('[data-r~="dlwrap"]').forEach((wrap, index) => {
    const menu = wrap.querySelector('[data-dl-menu]');
    const toggle = wrap.querySelector('[data-action="toggleDownloads"]');
    if (!menu || !toggle) return;

    const menuId = menu.id || `cave-download-options-${index + 1}`;
    menu.id = menuId;
    toggle.setAttribute('aria-controls', menuId);
    toggle.setAttribute('aria-expanded', 'false');
    paintMenu(menu, false);

    menu.querySelectorAll('[data-dl-plat]').forEach((tab) => {
      const platform = tab.dataset.dlPlat;
      const panel = menu.querySelector(`[data-dl-pane="${platform}"]`);
      const tabId = `${menuId}-${platform}-tab`;
      const panelId = `${menuId}-${platform}-panel`;
      tab.id = tabId;
      tab.setAttribute('aria-controls', panelId);
      tab.addEventListener('keydown', onTabKeydown);
      if (panel) {
        panel.id = panelId;
        panel.setAttribute('aria-labelledby', tabId);
      }
    });

    selectPlatform(menu, 'mac', { report: false });
  });

  document.querySelectorAll('[data-dl-btn]').forEach((link) => {
    link.addEventListener('click', () => {
      capture('download_started', {
        platform: link.dataset.dlPlatform || 'mac',
      });
    });
  });

  document.addEventListener('click', (event) => {
    if (!activeMenu) return;
    if (activeMenu.contains(event.target) || activeToggle?.contains(event.target)) return;
    closeDownloads();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeMenu) {
      event.preventDefault();
      closeDownloads({ restoreFocus: true });
    }
  });
}

export function initDownloads() {
  register('toggleDownloads', toggleDownloads);
  register('pickPlatform', pickPlatform);
  register('copy', copy);
  adaptPlatform();
  initializeDownloadControls();
  loadArtifacts();
}
