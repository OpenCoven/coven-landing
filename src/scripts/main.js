(function wireHeader() {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var sync = function () {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  sync();
  window.addEventListener('scroll', sync, { passive: true });
})();

(function wireMobileNavigation() {
  var toggle = document.querySelector('.mobile-toggle');
  var dialog = document.getElementById('mobile-nav');
  var closeButton = dialog?.querySelector('.mobile-nav-close');
  if (!toggle || !dialog || !closeButton) return;

  var previousFocus = null;
  var inertTargets = new Map();
  var bodyObserver = null;
  var previousOverflow = '';
  var focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  function makeBackgroundInert(target) {
    if (
      !(target instanceof HTMLElement)
      || target === dialog
      || target.tagName === 'SCRIPT'
      || inertTargets.has(target)
    ) return;
    inertTargets.set(target, target.inert);
    target.inert = true;
  }

  function openMobile() {
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    dialog.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    Array.from(document.body.children).forEach(makeBackgroundInert);
    bodyObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.from(mutation.addedNodes).forEach(makeBackgroundInert);
      });
    });
    bodyObserver.observe(document.body, { childList: true });
    closeButton.focus();
  }

  function closeMobile() {
    if (dialog.hidden) return;
    bodyObserver?.disconnect();
    bodyObserver = null;
    dialog.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = previousOverflow;
    inertTargets.forEach(function (wasInert, target) {
      target.inert = wasInert;
    });
    inertTargets.clear();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    else toggle.focus();
    previousFocus = null;
    previousOverflow = '';
  }

  toggle.addEventListener('click', openMobile);
  closeButton.addEventListener('click', closeMobile);
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) closeMobile();
  });
  dialog.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMobile);
  });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobile();
      return;
    }
    if (event.key !== 'Tab') return;

    var focusable = Array.from(
      dialog.querySelectorAll(focusableSelector),
    ).filter(function (element) {
      return !element.hasAttribute('hidden');
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  var desktop = window.matchMedia('(min-width: 901px)');
  var onDesktop = function (event) {
    if (event.matches) closeMobile();
  };
  if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
  else desktop.addListener(onDesktop);
  document.documentElement.classList.add('mobile-nav-on');
})();

  // ── Scroll reveals ────────────────────────────────────────
  (function () {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    var motionOn = document.documentElement.classList.contains('motion-on');
    if (!motionOn || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    items.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-visible');
      }
    });
    document.documentElement.classList.add('reveal-ready');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) {
      if (!el.classList.contains('is-visible')) io.observe(el);
    });
  })();

  // ── Ambient glow parallax (cursor-driven on desktop) ──────
  (function () {
    if (!document.documentElement.classList.contains('motion-on')) return;
    if (!window.matchMedia || !matchMedia('(hover: hover)').matches) return;
    var ambient = document.querySelector('.ambient');
    if (!ambient) return;
    var lastX = 0, lastY = 0, pending = false;
    window.addEventListener('mousemove', function (e) {
      lastX = e.clientX; lastY = e.clientY;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        var mx = (lastX / window.innerWidth) - 0.5;
        var my = (lastY / window.innerHeight) - 0.5;
        ambient.style.setProperty('--mx', mx.toFixed(3));
        ambient.style.setProperty('--my', my.toFixed(3));
        pending = false;
      });
    }, { passive: true });
  })();

  // ── Quick Start: copy-to-clipboard ────────────────────────
  (function wireCopyControls() {
    var buttons = document.querySelectorAll('.qs-copy[data-copy]');
    if (!buttons.length) return;
    var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    var FALLBACK_MESSAGE = 'Copy unavailable. Command selected. Press Ctrl+C or Command+C to copy manually.';
    var liveRegion = document.querySelector('[data-copy-live]');
    var guidanceNodes = document.querySelectorAll('[data-copy-guidance]');
    var latestRequestToken = 0;

    function announce(message) {
      if (liveRegion) liveRegion.textContent = message;
    }

    function hideGuidance() {
      guidanceNodes.forEach(function (guidance) {
        guidance.hidden = true;
        guidance.textContent = '';
        guidance.closest('[data-copy-surface]')?.classList.remove('has-copy-guidance');
      });
    }

    function showGuidance(button) {
      var surface = button.closest('[data-copy-surface]');
      var guidance = surface?.querySelector('[data-copy-guidance]');
      if (!surface || !guidance) return;
      guidance.textContent = FALLBACK_MESSAGE;
      guidance.hidden = false;
      surface.classList.add('has-copy-guidance');
    }

    function selectCommand(button) {
      var surface = button.closest('[data-copy-surface]') || button.parentElement;
      var code = surface?.querySelector('code');
      if (!code) return;
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(code);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    buttons.forEach(function (button) {
      var originalHtml = button.innerHTML;
      var originalLabel = button.getAttribute('aria-label') || 'Copy command';
      var resetTimer = null;
      var attemptToken = 0;
      button.addEventListener('click', async function () {
        var currentAttempt = ++attemptToken;
        var requestToken = ++latestRequestToken;
        hideGuidance();
        if (resetTimer) {
          window.clearTimeout(resetTimer);
          resetTimer = null;
        }
        var command = button.getAttribute('data-copy') || '';
        try {
          if (!navigator.clipboard?.writeText) {
            throw new Error('Clipboard API unavailable');
          }
          await navigator.clipboard.writeText(command);
          if (
            currentAttempt !== attemptToken ||
            requestToken !== latestRequestToken
          ) return;
          button.classList.remove('is-copy-failed');
          button.classList.add('is-copied');
          button.innerHTML = CHECK_SVG;
          button.setAttribute('aria-label', 'Copied');
          announce(`Copied: ${command}`);
          resetTimer = window.setTimeout(function () {
            if (currentAttempt !== attemptToken) return;
            button.classList.remove('is-copied');
            button.innerHTML = originalHtml;
            button.setAttribute('aria-label', originalLabel);
            resetTimer = null;
          }, 1_400);
        } catch {
          if (
            currentAttempt !== attemptToken ||
            requestToken !== latestRequestToken
          ) return;
          button.classList.remove('is-copied');
          button.classList.add('is-copy-failed');
          button.innerHTML = originalHtml;
          button.setAttribute(
            'aria-label',
            'Copy unavailable. Select the command and copy manually.',
          );
          selectCommand(button);
          showGuidance(button);
          announce(FALLBACK_MESSAGE);
        }
      });
    });
  })();

  // ── Download CTA: detect visitor's platform ─────────────────
  //
  // Rewrites the primary button's label/href to match the visitor's platform.
  // Optional sublabel and iOS controls remain compatibility hooks for fuller
  // download treatments that share this script. Server-rendered defaults
  // remain usable without JS.
  //
  // Detection order:
  //   1. UA-string OS markers (most intentional; matches UA overrides)
  //   2. UA-Client-Hints `platform` (Chromium)
  //   3. `navigator.platform` fallback
  //   4. Default fallback: macOS
  (function () {
    var cta = document.querySelector('[data-download-cta]');
    if (!cta) return;

    var primary = cta.querySelector('[data-download-primary]');
    var labelEl = cta.querySelector('[data-download-label]');
    var subEl = cta.querySelector('[data-download-sub]');
    if (!primary) return;

    // Stable download routes → direct installer files. A serverless
    // function (api/download.js) resolves the latest release per request,
    // so these paths never change and there's nothing to bump per release.
    var DOWNLOAD = { mac: '/download/mac', win: '/download/windows', linux: '/download/linux' };
    var testflightUrl = cta.getAttribute('data-testflight-url');

    var ua = navigator.userAgent || '';
    var rawPlatform = (navigator.platform || '').toLowerCase();
    var uaPlatform = '';
    try {
      // UA-Client-Hints (Chromium-based browsers). High-entropy
      // hints would be more accurate but require a Permissions-Policy
      // header; the low-entropy 'platform' string is fine for our
      // four-bucket detection.
      if (navigator.userAgentData && navigator.userAgentData.platform) {
        uaPlatform = String(navigator.userAgentData.platform).toLowerCase();
      }
    } catch (_) {}

    // iPad on iOS 13+ reports as Mac in UA + platform. Disambiguate
    // by checking for multi-touch capability (Macs report 0).
    var isIOSDevice = /iPhone|iPad|iPod/i.test(ua) ||
                      (rawPlatform === 'macintel' && navigator.maxTouchPoints > 1);

    // Order: explicit UA-string markers > UA-Client-Hints > navigator.platform.
    // The UA string is what dev tools / mobile sites set, and it's the most
    // intentional signal. Client hints + navigator.platform come from the OS
    // and can't always be overridden, so they go last.
    var detected = 'mac';
    if (isIOSDevice) {
      detected = 'ios';
    } else if (/Windows/i.test(ua)) {
      detected = 'win';
    } else if (/Linux|X11|CrOS|Android/i.test(ua) && !/Mac/i.test(ua)) {
      // Android browsers report "Linux" too — we don't ship Android yet,
      // so steering them to the Linux/CLI path is the least-bad option.
      detected = 'linux';
    } else if (/Mac OS X|Macintosh/i.test(ua)) {
      detected = 'mac';
    } else if (uaPlatform.indexOf('win') >= 0 || rawPlatform.indexOf('win') >= 0) {
      detected = 'win';
    } else if (uaPlatform.indexOf('linux') >= 0 || rawPlatform.indexOf('linux') >= 0 ||
               uaPlatform.indexOf('chromeos') >= 0) {
      detected = 'linux';
    } else if (uaPlatform.indexOf('mac') >= 0 || rawPlatform.indexOf('mac') >= 0) {
      detected = 'mac';
    }

    var COPY = {
      mac: { label: 'Download Coven Cave for macOS', sub: 'CovenCave · .dmg · signed · free', href: DOWNLOAD.mac },
      win: { label: 'Download Coven Cave for Windows', sub: 'CovenCave · .msi · signed · free', href: DOWNLOAD.win },
      linux: { label: 'Download Coven Cave for Linux', sub: 'CovenCave · .AppImage · x86_64 · free', href: DOWNLOAD.linux },
      ios: { label: 'Get Coven Cave for iOS beta', sub: 'CovenCave · TestFlight · iPhone & iPad', href: testflightUrl },
    };

    var copy = COPY[detected] || COPY.mac;
    if (labelEl) labelEl.textContent = copy.label;
    if (subEl) subEl.textContent = copy.sub;
    if (copy.href) primary.setAttribute('href', copy.href);
    primary.setAttribute('data-platform', detected);
    if (detected === 'ios') {
      primary.setAttribute('target', '_blank');
      primary.setAttribute('rel', 'noopener noreferrer');
    }

    // If a fuller treatment includes an iOS control, keep the macOS path
    // available when the primary link points to TestFlight.
    var iosBtn = cta.querySelector('[data-download-ios]');
    if (iosBtn && detected === 'ios') {
      iosBtn.setAttribute('href', DOWNLOAD.mac);
      iosBtn.removeAttribute('target');
      iosBtn.removeAttribute('rel');
      var iosLabel = iosBtn.querySelector('[data-download-ios-label]');
      var iosSub = iosBtn.querySelector('[data-download-ios-sub]');
      if (iosLabel) iosLabel.textContent = 'Download for macOS';
      if (iosSub) iosSub.textContent = 'CovenCave · .dmg · signed · free';
    }

    // Stamp the resolved platform on the cta for analytics / debug.
    cta.setAttribute('data-detected', detected);
  })();

  // ── Theme toggle: cycles system → light → dark ────────────
  // The pre-paint script in ThemeInit.astro already stamped <html> with the
  // resolved theme + preference; this only wires the header button and keeps
  // 'system' in sync with the OS. Preference persists in localStorage.
  (function () {
    var STORAGE_KEY = 'theme';
    var ORDER = ['system', 'light', 'dark'];
    var LABELS = { system: 'System', light: 'Light', dark: 'Dark' };
    var html = document.documentElement;
    var btn = document.querySelector('[data-theme-toggle]');
    var mql = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;

    function getPref() {
      var p = null;
      try { p = localStorage.getItem(STORAGE_KEY); } catch (e) {}
      return (p === 'light' || p === 'dark' || p === 'system') ? p : 'system';
    }
    function resolve(pref) {
      if (pref === 'system') return (mql && mql.matches) ? 'light' : 'dark';
      return pref;
    }
    function apply(pref) {
      var resolved = resolve(pref);
      html.dataset.theme = resolved;
      html.dataset.themePref = pref;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', resolved === 'light' ? '#FBFAFF' : '#050409');
      if (btn) {
        var hint = pref === 'system' ? 'System (' + resolved + ')' : LABELS[pref];
        btn.setAttribute('aria-label', 'Theme: ' + LABELS[pref] + ' — click to change');
        btn.setAttribute('title', 'Theme: ' + hint);
      }
    }

    var currentPref = getPref();
    apply(currentPref);

    if (btn) {
      btn.addEventListener('click', function () {
        var next = ORDER[(ORDER.indexOf(currentPref) + 1) % ORDER.length];
        currentPref = next;
        try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
        apply(next);
      });
    }

    // While in system mode, follow live OS light/dark changes.
    if (mql) {
      var onChange = function () { if (currentPref === 'system') apply('system'); };
      if (mql.addEventListener) mql.addEventListener('change', onChange);
      else if (mql.addListener) mql.addListener(onChange);
    }
  })();
