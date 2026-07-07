// Shared interaction helpers for the landing page sections.
// Imported by component <script> modules (and available to main.js).
// Dependency-free, ES module. Each helper degrades gracefully when
// motion is off (matching the site's .motion-on convention).

function motionOn() {
  return document.documentElement.classList.contains('motion-on');
}

// Crossfade a live region while its contents are repainted. Generalizes the
// hero memory-swap: add .is-swapping (CSS dips opacity), repaint after `ms`,
// then remove. With motion off, repaint immediately so nothing is hidden.
export function fadeSwap(el, repaint, opts) {
  var ms = (opts && opts.ms) || 200;
  if (!el || !motionOn()) {
    if (repaint) repaint();
    return;
  }
  el.classList.add('is-swapping');
  setTimeout(function () {
    if (repaint) repaint();
    el.classList.remove('is-swapping');
  }, ms);
}

// Roving-tabindex arrow-key wiring for a radiogroup-style set of buttons.
// Lifted verbatim from HowItWorks; `attr` is retained for call-site
// compatibility (state is applied by the onSelect callback).
export function wireRadioGroup(buttons, attr, onSelect) {
  var order = Array.from(buttons);
  order.forEach(function (btn) {
    btn.addEventListener('click', function () { onSelect(btn); });
    btn.addEventListener('keydown', function (e) {
      var i = order.indexOf(btn);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        var next = order[(i + 1) % order.length];
        next.focus(); onSelect(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = order[(i - 1 + order.length) % order.length];
        prev.focus(); onSelect(prev);
      } else if (e.key === 'Home') {
        e.preventDefault();
        order[0].focus(); onSelect(order[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        order[order.length - 1].focus(); onSelect(order[order.length - 1]);
      }
    });
  });
}

// Typewriter effect for a single element. Generalizes the hero typeCommand.
// Returns a canceller. With motion off, sets the text immediately.
export function typewriter(el, text, opts) {
  if (!el) return function () {};
  var min = (opts && opts.min) || 24;
  var jitter = (opts && opts.jitter) || 28;
  var timer = null;
  if (!motionOn()) { el.textContent = text; return function () {}; }
  el.textContent = '';
  var i = 0;
  function step() {
    if (i >= text.length) return;
    el.textContent += text.charAt(i++);
    timer = setTimeout(step, min + Math.random() * jitter);
  }
  step();
  return function cancel() { if (timer) { clearTimeout(timer); timer = null; } };
}

// 2-D roving-tabindex arrow navigation over nodes arranged in `cols` columns
// (row-major). Left/Right move within a row, Up/Down across rows, Home/End
// jump to the ends. `onFocus` fires with the newly focused node (optional).
// Used by the Architecture layer lattice.
export function grid2DNav(nodes, cols, onFocus) {
  var order = Array.from(nodes);
  if (!order.length) return;
  function move(idx) {
    idx = Math.max(0, Math.min(order.length - 1, idx));
    order.forEach(function (n, k) { n.setAttribute('tabindex', k === idx ? '0' : '-1'); });
    order[idx].focus();
    if (onFocus) onFocus(order[idx], idx);
  }
  order.forEach(function (node, i) {
    node.addEventListener('keydown', function (e) {
      var handled = true;
      switch (e.key) {
        case 'ArrowRight': move(i + 1); break;
        case 'ArrowLeft':  move(i - 1); break;
        case 'ArrowDown':  move(i + cols); break;
        case 'ArrowUp':    move(i - cols); break;
        case 'Home':       move(0); break;
        case 'End':        move(order.length - 1); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    });
  });
}
