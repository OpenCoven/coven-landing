  // Mobile nav
  const toggle = document.querySelector('.mobile-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const closeBtn = document.querySelector('.mobile-nav-close');

  toggle.addEventListener('click', () => {
    mobileNav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  });
  function closeMobile() {
    mobileNav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  closeBtn.addEventListener('click', closeMobile);
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobile));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobile(); });

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
  (function () {
    var buttons = document.querySelectorAll('.qs-copy[data-copy]');
    if (!buttons.length || !navigator.clipboard) return;
    var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    var liveRegion = document.querySelector('[data-copy-live]');
    buttons.forEach(function (btn) {
      var originalHTML = btn.innerHTML;
      // Restore the step-specific label (e.g. "Copy install command")
      // instead of a hardcoded string.
      var originalLabel = btn.getAttribute('aria-label') || 'Copy command';
      var resetTimer = null;
      btn.addEventListener('click', function () {
        var cmd = btn.getAttribute('data-copy');
        navigator.clipboard.writeText(cmd).then(function () {
          btn.classList.add('is-copied');
          btn.innerHTML = CHECK_SVG;
          btn.setAttribute('aria-label', 'Copied');
          // Announce success to screen readers.
          if (liveRegion) liveRegion.textContent = 'Copied: ' + cmd;
          if (resetTimer) clearTimeout(resetTimer);
          resetTimer = setTimeout(function () {
            btn.classList.remove('is-copied');
            btn.innerHTML = originalHTML;
            btn.setAttribute('aria-label', originalLabel);
          }, 1400);
        });
      });
    });
  })();

  // ── Download CTA: detect visitor's platform ─────────────────
  //
  // Rewrites the primary button's label/sub/href to match the visitor's
  // platform; on iOS the dedicated TestFlight button retargets to macOS.
  // Works fully without JS — both buttons are real <a href>s — this only
  // retargets the emphasis.
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
      mac: { label: 'Download Coven Cave for macOS', href: DOWNLOAD.mac },
      win: { label: 'Download Coven Cave for Windows', href: DOWNLOAD.win },
      linux: { label: 'Download Coven Cave for Linux', href: DOWNLOAD.linux },
      ios: { label: 'Get Coven Cave for iOS beta', href: testflightUrl },
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

    // On iOS the primary already points at TestFlight, so retarget the
    // dedicated iOS button to macOS — both paths stay one click away.
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

    apply(getPref());

    if (btn) {
      btn.addEventListener('click', function () {
        var next = ORDER[(ORDER.indexOf(getPref()) + 1) % ORDER.length];
        try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
        apply(next);
      });
    }

    // While in system mode, follow live OS light/dark changes.
    if (mql) {
      var onChange = function () { if (getPref() === 'system') apply('system'); };
      if (mql.addEventListener) mql.addEventListener('change', onChange);
      else if (mql.addListener) mql.addListener(onChange);
    }
  })();
