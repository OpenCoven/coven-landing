// Hero behaviors: braid mount geometry + fade-in, the click-to-power seat,
// the mark tilt light-sweep, and the phone-only braid parallax.

import { register, updateBinding } from './actions.js';

const timers = [];
const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

// ── power seat ──────────────────────────────────────────────────────────
let powered = false;
let dyingT = null;

function paintPower(dying) {
  updateBinding('braidPower', powered ? 'on' : 'off');
  updateBinding('sigilState', dying ? 'dying' : powered ? 'on' : 'off');
  updateBinding('braidPressed', powered ? 'true' : 'false');
  updateBinding('spinAria', powered ? 'Spin the coven down' : 'Spin the coven up');
  updateBinding('hintOpacity', powered ? 0.55 : 0.8);
  const hint = document.querySelector('[data-spin-hint]');
  if (hint) hint.textContent = powered ? 'powered' : 'click to power';
}

function togglePower() {
  powered = !powered;
  if (dyingT) clearTimeout(dyingT);
  // powering down runs a short red flicker on the sigils before they go cold
  paintPower(!powered);
  if (!powered) {
    dyingT = setTimeout(() => { dyingT = null; paintPower(false); }, 1000);
  }
}

// ── braid mount ─────────────────────────────────────────────────────────
// the canvas becomes the hero's full-bleed background: no box edge exists
// near the object, so nothing has to be masked away to hide one
export function maskBraid() {
  const apply = () => {
    const el = document.querySelector('warded-braid');
    const header = document.querySelector('#top');
    if (!el || !header) return false;
    if (el.dataset.bled === 'hero2') return true;
    el.dataset.bled = 'hero2';

    // NB: never re-parent the element — that fires disconnectedCallback and
    // the component tears its renderer down. Geometry lives in the template.
    header.style.position = 'relative';
    header.style.zIndex = '50';
    el.style.pointerEvents = 'none';

    const copy = document.querySelector('[data-hero]');
    if (copy) { copy.style.position = 'relative'; copy.style.zIndex = '2'; }
    window.dispatchEvent(new Event('resize'));

    // fade in only once the renderer has actually painted a frame
    const mount = el.closest('[data-braid]');
    const lightUp = () => {
      const canvas = el.querySelector('canvas');
      if (!canvas || !canvas.width) return false;
      if (mount) mount.setAttribute('data-ready', '');
      el.setAttribute('data-lit', '');
      return true;
    };
    if (!lightUp()) {
      let waits = 0;
      const wait = setInterval(() => { if (lightUp() || ++waits > 60) clearInterval(wait); }, 100);
      timers.push(wait);
    }
    return true;
  };
  if (!apply()) {
    let tries = 0;
    const id = setInterval(() => { if (apply() || ++tries > 40) clearInterval(id); }, 120);
    timers.push(id);
  }
}

// ── phone-only parallax ─────────────────────────────────────────────────
// 1 - e^(-y/240) spends most of its travel in the first 200px and flattens
// after, so the object drifts behind the headline without sliding down the
// whole page.
export function braidParallax() {
  const band = document.querySelector('[data-braid]');
  if (!band) return;
  if (window.innerWidth >= 720 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (band.style.transform) { band.style.transform = ''; band.style.willChange = ''; }
    return;
  }
  const y = Math.max(0, window.scrollY);
  const shift = 78 * (1 - Math.exp(-y / 240));
  band.style.willChange = 'transform';
  band.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
}

// ── mark tilt ───────────────────────────────────────────────────────────
// normalised against the seat rather than the glyph, so the sweep reads as
// one surface catching the light with the object, not a badge of its own
function initMarkTilt() {
  const cur = { x: 0, y: 0 };
  const tgt = { x: 0, y: 0 };
  let raf = null;
  let markEl = null;
  const step = () => {
    cur.x += (tgt.x - cur.x) * 0.11;
    cur.y += (tgt.y - cur.y) * 0.11;
    const root = document.documentElement;
    root.style.setProperty('--mk-x', cur.x.toFixed(4));
    root.style.setProperty('--mk-y', cur.y.toFixed(4));
    const settled = Math.abs(tgt.x - cur.x) < 0.0015 && Math.abs(tgt.y - cur.y) < 0.0015;
    raf = settled ? null : requestAnimationFrame(step);
  };
  window.addEventListener('pointermove', (e) => {
    const m = markEl || (markEl = document.querySelector('[data-core-mark]'));
    if (!m) return;
    const r = m.getBoundingClientRect();
    if (!r.width) return;
    const span = r.width * 4.4;
    tgt.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / span));
    tgt.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / span));
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: true });
}

export function initHero() {
  register('togglePower', togglePower);
  maskBraid();
  initMarkTilt();
  // the panel, the seat and the sigils are desktop-only, so the power state
  // cannot survive a resize past them: without its chrome the interaction
  // has no feedback at all
  const narrow = window.matchMedia('(max-width: 1079px)');
  narrow.addEventListener('change', (e) => {
    if (e.matches && powered) { powered = false; if (dyingT) clearTimeout(dyingT); paintPower(false); }
  });
}
