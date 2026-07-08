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

  // ── Hero terminal: live summon session ────────────────────
  (function () {
    var tabs = document.querySelectorAll('.roster-tab[data-familiar]');
    if (tabs.length === 0) return;
    var card     = document.querySelector('.hero-card');
    var output   = document.querySelector('.hero-card-output');
    var sigilEl  = document.querySelector('[data-sigil]');
    var nameEl   = document.querySelector('[data-name]');
    var roleEl   = document.querySelector('[data-role]');
    var countEl  = document.querySelector('[data-count]');
    var memNotes = document.querySelectorAll('.memory-note');
    var cliCmd   = document.querySelector('.card-cmd');
    var motionOn = document.documentElement.classList.contains('motion-on');

    var FAMILIARS = {
      hexi: {
        name: 'Hexi',
        sigil: 'H',
        role: 'code steward · tools · git',
        count: '128 notes · 47 days',
        command: 'coven attach hexi --project ./opencoven',
        notes: [
          { text: 'resumed feat/runtime-attach · 4 files staged', meta: '2h ago' },
          { text: 'prefers terse PR summaries, no trailing recap', meta: 'persisted' }
        ]
      },
      charm: {
        name: 'Charm',
        sigil: 'C',
        role: 'voice · social · presence',
        count: '64 notes · 21 days',
        command: 'coven attach charm --voice on --thread design-sync',
        notes: [
          { text: 'drafted reply for #design-sync · awaiting review', meta: '12m ago' },
          { text: 'tone: warm + concise — no exclamation marks', meta: 'persisted' }
        ]
      },
      sage: {
        name: 'Sage',
        sigil: 'S',
        role: 'research · docs · long context',
        count: '203 notes · 65 days',
        command: 'coven attach sage --context ./docs --long',
        notes: [
          { text: 'loaded 4 docs into context · 18k tokens', meta: '40m ago' },
          { text: 'model: long-context first, summarize before answer', meta: 'persisted' }
        ]
      }
    };
    var order = ['hexi', 'charm', 'sage'];
    var current = 'hexi';
    var userTook = false;
    var rotateTimer = null;
    var typeTimer = null;

    function typeCommand(cmd) {
      if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
      if (!cliCmd) return;
      if (!motionOn) { cliCmd.textContent = cmd; return; }
      cliCmd.textContent = '';
      var i = 0;
      function step() {
        if (i >= cmd.length) return;
        cliCmd.textContent += cmd.charAt(i++);
        typeTimer = setTimeout(step, 24 + Math.random() * 28);
      }
      step();
    }

    function paintOutput(data) {
      if (sigilEl) sigilEl.textContent = data.sigil;
      if (nameEl)  nameEl.textContent = data.name;
      if (roleEl)  roleEl.textContent = data.role;
      if (countEl) countEl.textContent = data.count;
      for (var i = 0; i < memNotes.length; i++) {
        var note = data.notes[i];
        if (!note) continue;
        var t = memNotes[i].querySelector('.memory-text');
        var m = memNotes[i].querySelector('.memory-meta');
        if (t) t.textContent = note.text;
        if (m) m.textContent = note.meta;
      }
    }

    function applyFamiliar(id, animate) {
      if (!FAMILIARS[id]) return;
      current = id;
      tabs.forEach(function (tab) {
        var isActive = tab.getAttribute('data-familiar') === id;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
      });
      var data = FAMILIARS[id];
      if (animate && output && motionOn) {
        output.classList.add('memory-swap');
        setTimeout(function () {
          paintOutput(data);
          output.classList.remove('memory-swap');
        }, 200);
      } else {
        paintOutput(data);
      }
      typeCommand(data.command);
    }

    function rotate() {
      var idx = order.indexOf(current);
      applyFamiliar(order[(idx + 1) % order.length], true);
    }
    function startRotate() {
      if (userTook) return;
      stopRotate();
      rotateTimer = setInterval(rotate, 6000);
    }
    function stopRotate() {
      if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        userTook = true;
        stopRotate();
        applyFamiliar(tab.getAttribute('data-familiar'), true);
      });
      // Roving tabindex + arrow keys (standard tablist keyboard pattern)
      tab.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = tabs[(i + dir + tabs.length) % tabs.length];
        userTook = true;
        stopRotate();
        applyFamiliar(next.getAttribute('data-familiar'), true);
        next.focus();
      });
    });

    if (card) {
      card.addEventListener('mouseenter', stopRotate);
      card.addEventListener('mouseleave', function () { if (!userTook) startRotate(); });
      card.addEventListener('focusin', stopRotate);
      card.addEventListener('focusout', function () { if (!userTook) startRotate(); });
    }

    if (motionOn) startRotate();
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

    var releasesUrl = cta.getAttribute('data-releases-url');
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
      mac:   { label: 'Download for macOS',   sub: 'CovenCave · .dmg · signed · free',      href: releasesUrl },
      win:   { label: 'Download for Windows', sub: 'CovenCave · .msi · signed · free',      href: releasesUrl },
      linux: { label: 'Download for Linux',   sub: 'CovenCave · .AppImage · x86_64 · free', href: releasesUrl },
      ios:   { label: 'Get the iOS beta',     sub: 'CovenCave · TestFlight · iPhone & iPad', href: testflightUrl },
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
    if (iosBtn && detected === 'ios' && releasesUrl) {
      iosBtn.setAttribute('href', releasesUrl);
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
