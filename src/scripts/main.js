  // Mobile nav
  const toggle = document.querySelector('.mobile-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const closeBtn = document.querySelector('.mobile-nav-close');

  if (toggle && mobileNav && closeBtn) {
    toggle.addEventListener('click', () => {
      mobileNav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      mobileNav.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    });
    function closeMobile(restoreFocus) {
      mobileNav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      mobileNav.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (restoreFocus) toggle.focus();
    }
    closeBtn.addEventListener('click', () => closeMobile(true));
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMobile(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && mobileNav.classList.contains('is-open')) closeMobile(true); });
  }

  // ── Scroll reveals ────────────────────────────────────────
  (function () {
    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    var motionOn = document.documentElement.classList.contains('motion-on');
    if (!motionOn || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
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

  // ── Hero card: live familiar state ────────────────────────
  (function () {
    var rows = document.querySelectorAll('.card-familiar[data-familiar]');
    if (rows.length === 0) return;
    var card       = document.querySelector('.hero-card');
    var memBody    = document.querySelector('.hero-card-memory');
    var memTitle   = document.querySelector('.memory-title');
    var memNotes   = document.querySelectorAll('.memory-note');
    var cliCmd     = document.querySelector('.card-cmd');
    var motionOn   = document.documentElement.classList.contains('motion-on');

    var FAMILIARS = {
      forge: {
        name: 'Forge',
        command: 'coven attach forge --project ./opencoven',
        notes: [
          { text: 'resumed feat/runtime-attach · 4 files staged', meta: '2h ago' },
          { text: 'prefers terse PR summaries, no trailing recap', meta: 'persisted' }
        ]
      },
      charm: {
        name: 'Charm',
        command: 'coven attach charm --voice on --thread design-sync',
        notes: [
          { text: 'drafted reply for #design-sync · awaiting review', meta: '12m ago' },
          { text: 'tone: warm + concise — no exclamation marks', meta: 'persisted' }
        ]
      },
      sage: {
        name: 'Sage',
        command: 'coven attach sage --context ./docs --long',
        notes: [
          { text: 'loaded 4 docs into context · 18k tokens', meta: '40m ago' },
          { text: 'model: long-context first, summarize before answer', meta: 'persisted' }
        ]
      }
    };
    var order = ['forge', 'charm', 'sage'];
    var current = 'forge';
    var userTook = false;
    var rotateTimer = null;
    var typeTimer = null;

    function setBadge(badge, isActive) {
      if (!badge) return;
      badge.textContent = isActive ? 'active' : 'idle';
      badge.classList.toggle('badge-active', isActive);
      badge.classList.toggle('badge-idle', !isActive);
    }

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

    function paintNotes(data) {
      if (memTitle) memTitle.textContent = 'memory · ' + data.name.toLowerCase();
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
      rows.forEach(function (row) {
        var isActive = row.getAttribute('data-familiar') === id;
        row.classList.toggle('active', isActive);
        row.setAttribute('aria-selected', isActive ? 'true' : 'false');
        row.setAttribute('tabindex', isActive ? '0' : '-1');
        setBadge(row.querySelector('.familiar-badge'), isActive);
      });
      var data = FAMILIARS[id];
      if (animate && memBody && motionOn) {
        memBody.classList.add('memory-swap');
        setTimeout(function () {
          paintNotes(data);
          memBody.classList.remove('memory-swap');
        }, 200);
      } else {
        paintNotes(data);
      }
      typeCommand(data.command);
    }

    function rotate() {
      var idx = order.indexOf(current);
      var next = order[(idx + 1) % order.length];
      applyFamiliar(next, true);
    }
    function startRotate() {
      if (userTook) return;
      stopRotate();
      rotateTimer = setInterval(rotate, 6000);
    }
    function stopRotate() {
      if (rotateTimer) { clearInterval(rotateTimer); rotateTimer = null; }
    }

    rows.forEach(function (row) {
      row.addEventListener('click', function () {
        userTook = true;
        stopRotate();
        applyFamiliar(row.getAttribute('data-familiar'), true);
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          userTook = true;
          stopRotate();
          applyFamiliar(row.getAttribute('data-familiar'), true);
        }
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
    buttons.forEach(function (btn) {
      var originalHTML = btn.innerHTML;
      var resetTimer = null;
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(function () {
          btn.classList.add('is-copied');
          btn.innerHTML = CHECK_SVG;
          btn.setAttribute('aria-label', 'Copied');
          if (resetTimer) clearTimeout(resetTimer);
          resetTimer = setTimeout(function () {
            btn.classList.remove('is-copied');
            btn.innerHTML = originalHTML;
            btn.setAttribute('aria-label', 'Copy command');
          }, 1400);
        });
      });
    });
  })();
