// How it works page entry — wires the shared behavior modules in the same
// order landing.js does, then layers in the page-specific motion: the
// architecture diagram scrub, the harness rail, the marquee, the day
// timeline, the session and verdict demos, and the worktree-only vs Coven
// tape comparison. Theme, nav, downloads and the generic entrance reveals
// (data-hero, data-anim, data-anim-group) live in the shared modules and are
// not duplicated here.

import { initActions } from './actions.js';
import { initTheme } from './theme.js';
import { initNav } from './nav.js';
import { initDownloads } from './downloads.js';
import { initMotion } from './motion.js';
import { initBoard } from './board.js';

const timers = [];
const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };

// ── harness rail (the day-timeline logo stack: hover to spread, fan back on leave) ──
function wireOneRail(rail) {
  if (!rail) return;
  const items = Array.from(rail.querySelectorAll('[data-harness-item]'));
  const show = (idx) => {
    items.forEach((it, i) => {
      const on = i === idx;
      it.style.marginLeft = i === 0 ? '0' : on || i === idx + 1 ? '2px' : '-7px';
      it.style.zIndex = on ? '20' : String(10 - i);
      const label = it.querySelector('[data-harness-label]');
      if (!label) return;
      label.style.maxWidth = on ? '92px' : '0';
      label.style.opacity = on ? '1' : '0';
      label.style.marginLeft = on ? '6px' : '0';
    });
  };
  items.forEach((it, i) => { it.addEventListener('mouseenter', () => show(i)); });
  rail.addEventListener('mouseleave', () => show(-1));
}

function wireHarnessRail() {
  Array.from(document.querySelectorAll('[data-harness-rail]')).forEach((r) => wireOneRail(r));
}

// ── the "need" copy (birthday-problem panel) ────────────────────────────
// Dormant on the current markup: nothing on this page carries
// [data-need-rows], so runNeed() is wired the same defensive way the class
// wired it (only fires if the selector exists) and simply never fires. Kept
// verbatim so the panel lights up for free if that markup returns.
const NEED_COPY = {
  idle: {
    v: 'Not yet.',
    tone: 'muted',
    why: 'One worktree, nothing to overlap. Isolation covers this, and Coven sits idle.',
    note: 'Worktrees are doing the whole job here.'
  },
  soon: {
    v: 'Soon.',
    tone: 'soon',
    why: 'Two worktrees, one file. Each diff is clean on its own, so git finds the conflict at merge. Coven finds it at the claim.',
    note: 'One overlap today, and the count climbs with every worktree you add.'
  },
  yes: {
    v: 'Yes.',
    tone: 'yes',
    why: 'Separate worktrees kept the checkouts apart. Agents are rewriting the same files in parallel, and git only finds out at merge. Coven sees the overlap when the second agent reaches for the file.',
    note: '3 overlaps caught at the claim instead of at the merge.'
  }
};

function needCount(clashes) {
  if (!clashes) return 'no file is open in two worktrees';
  return clashes + (clashes === 1 ? ' file is open in two worktrees at once' : ' files are open in two worktrees at once') + ', and git will not say so until merge';
}

const WORDS = [
  'worktree, nothing to overlap with',
  'worktrees, both editing the same shell',
  'worktrees, one file overlapping in two places',
  'worktrees, and a second file overlaps',
  'worktrees, every merge is now a negotiation',
  'worktrees, and git will only tell you at merge time'
];

// every copy slot swaps between strings of different length, so each one is given the
// height of its longest variant up front -- otherwise the panel grows as the count climbs
function reserveNeed() {
  const slots = [
    ['[data-need-note]', Object.keys(NEED_COPY).map((k) => NEED_COPY[k].note)],
    ['[data-need-count]', [0, 1, 2, 3].map((c) => needCount(c))],
    ['[data-need-word]', WORDS]
  ];
  slots.forEach(([sel, variants]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const keep = el.textContent;
    el.style.minHeight = '0px';
    let tall = 0;
    variants.forEach((t) => { el.textContent = t; tall = Math.max(tall, el.offsetHeight); });
    el.textContent = keep;
    el.style.minHeight = tall + 'px';
  });
}

let onNeedResize = null;
let needTimer = null;

function runNeed() {
  reserveNeed();
  if (!onNeedResize) {
    onNeedResize = () => reserveNeed();
    window.addEventListener('resize', onNeedResize, { passive: true });
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { paintNeed(4); return; }
  if (needTimer) clearInterval(needTimer);
  let n = 1;
  paintNeed(n);
  needTimer = setInterval(() => {
    n = n >= 6 ? 1 : n + 1;
    paintNeed(n);
  }, 2000);
}

function paintNeed(n) {
  const nEl = document.querySelector('[data-need-n]');
  const wEl = document.querySelector('[data-need-word]');
  const track = document.querySelector('[data-need-track]');
  if (nEl) nEl.textContent = String(n);
  if (wEl) wEl.textContent = WORDS[n - 1];
  if (track) track.style.width = ((n / 6) * 100).toFixed(0) + '%';

  // four files, n agents picking one each: the birthday problem, plainly
  const P = [0, 25, 62.5, 90.6, 100, 100];
  const XS = [34.0, 85.6, 137.2, 188.8, 240.4, 292.0];
  const YS = [78.0, 62.5, 39.3, 21.8, 16.0, 16.0];
  const pct = document.querySelector('[data-need-pct]');
  const marker = document.querySelector('[data-need-marker]');
  const clip = document.querySelector('[data-need-clip]');
  const dot = document.querySelector('[data-need-dot]');
  const halo = document.querySelector('[data-need-halo]');
  const markTone = n >= 4 ? 'var(--cv-danger)' : n >= 2 ? 'var(--cv-warning)' : 'var(--cv-accent)';
  if (pct) {
    pct.textContent = (P[n - 1] % 1 ? P[n - 1].toFixed(1) : P[n - 1]) + '%';
    pct.style.color = n >= 2 ? markTone : 'var(--cv-text-muted)';
  }
  const shiftX = (XS[n - 1] - XS[0]).toFixed(1);
  // the curve is only drawn as far as the count has reached; the loop resets without unwinding
  if (clip) {
    const reset = n === 1;
    clip.style.transition = reset ? 'none' : 'transform 760ms cubic-bezier(0.2,0,0,1)';
    clip.style.transform = 'translateX(' + (XS[n - 1] - 292).toFixed(1) + 'px)';
    if (reset) { void clip.getBoundingClientRect(); clip.style.transition = 'transform 760ms cubic-bezier(0.2,0,0,1)'; }
  }
  if (marker) {
    marker.style.transition = n === 1 ? 'none' : 'transform 760ms cubic-bezier(0.2,0,0,1)';
    marker.style.transform = 'translate(' + shiftX + 'px, ' + (YS[n - 1] - YS[0]).toFixed(1) + 'px)';
  }
  if (dot) dot.setAttribute('stroke', markTone);
  if (halo) halo.setAttribute('fill', 'color-mix(in oklch, ' + markTone + ' 20%, transparent)');

  const rows = document.querySelector('[data-need-rows]');
  const count = document.querySelector('[data-need-count]');
  if (!rows) return;
  const FILES = [
    ['ph-file-code', 'ui/composer-shell.tsx'],
    ['ph-file-code', 'lib/use-session.ts'],
    ['ph-file-code', 'api/auth.ts'],
    ['ph-file-text', 'README.md']
  ];
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  // agents land on files two at a time, so the collisions arrive in a readable order
  const seats = [[], [], [], []];
  for (let i = 0; i < n; i++) seats[Math.min(3, Math.floor(i / 2))].push(LETTERS[i]);
  let clashes = 0;

  if (!rows.children.length) {
    FILES.forEach(([icon, name]) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 9px; height: 36px; padding: 0 12px; border-radius: 8px; background: var(--cv-bg-sunken); border: 1px solid transparent; transition: background-color 420ms cubic-bezier(0.2,0,0,1), border-color 420ms cubic-bezier(0.2,0,0,1)';
      const ic = document.createElement('i');
      ic.className = 'ph ' + icon;
      ic.setAttribute('aria-hidden', 'true');
      ic.setAttribute('data-need-icon', '');
      ic.style.cssText = 'font-size: 14px; line-height: 1; color: var(--cv-text-muted); flex: none; transition: color 380ms';
      const label = document.createElement('span');
      label.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 11px; color: var(--cv-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0";
      label.textContent = name;
      const tag = document.createElement('span');
      tag.setAttribute('data-need-tag', '');
      tag.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cv-warning); margin-left: auto; opacity: 0; transition: opacity 380ms cubic-bezier(0.2,0,0,1); flex: none";
      tag.textContent = '2 worktrees';
      const seatsEl = document.createElement('div');
      seatsEl.setAttribute('data-need-seats', '');
      seatsEl.style.cssText = 'display: flex; align-items: center; margin-left: auto; flex: none';
      row.appendChild(ic);
      row.appendChild(label);
      row.appendChild(tag);
      row.appendChild(seatsEl);
      rows.appendChild(row);
    });
  }

  Array.from(rows.children).forEach((row, i) => {
    const held = seats[i];
    const clash = held.length > 1;
    if (clash) clashes++;
    row.style.background = clash ? 'color-mix(in oklch, var(--cv-warning) 14%, transparent)' : 'var(--cv-bg-sunken)';
    row.style.borderColor = clash ? 'color-mix(in oklch, var(--cv-warning) 42%, transparent)' : 'transparent';
    const ic = row.querySelector('[data-need-icon]');
    if (ic) ic.style.color = clash ? 'var(--cv-warning)' : 'var(--cv-text-muted)';
    const tag = row.querySelector('[data-need-tag]');
    if (tag) { tag.style.opacity = clash ? '1' : '0'; tag.style.marginLeft = clash ? 'auto' : 'auto'; }
    const seatsEl = row.querySelector('[data-need-seats]');
    if (!seatsEl) return;
    seatsEl.style.marginLeft = clash ? '10px' : 'auto';
    while (seatsEl.children.length > held.length) seatsEl.removeChild(seatsEl.lastChild);
    while (seatsEl.children.length < held.length) {
      const a = document.createElement('span');
      a.style.cssText = "width: 21px; height: 21px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 9.5px; background: var(--cv-bg-elevated); border: 1px solid var(--cv-border-hairline); color: var(--cv-text-secondary); box-shadow: 0 0 0 2px var(--cv-bg-sunken); transform: scale(0.4); opacity: 0; transition: transform 420ms cubic-bezier(0.2,1.4,0.4,1), opacity 300ms, border-color 380ms, color 380ms, background-color 380ms";
      seatsEl.appendChild(a);
      requestAnimationFrame(() => { a.style.transform = 'scale(1)'; a.style.opacity = '1'; });
    }
    Array.from(seatsEl.children).forEach((a, k) => {
      a.textContent = held[k];
      a.style.marginLeft = k ? '-6px' : '0';
      a.style.zIndex = String(10 - k);
      a.style.borderColor = clash ? 'color-mix(in oklch, var(--cv-warning) 60%, transparent)' : 'var(--cv-border-hairline)';
      a.style.color = clash ? 'var(--cv-warning)' : 'var(--cv-text-secondary)';
      a.style.animation = clash ? 'cvWarn 2.4s ease-out infinite' : 'none';
    });
  });

  if (count) {
    count.textContent = needCount(clashes);
    count.style.color = clashes ? 'var(--cv-warning)' : 'var(--cv-text-muted)';
  }

  const copy = NEED_COPY[clashes >= 2 ? 'yes' : clashes === 1 ? 'soon' : 'idle'];
  const verdict = copy.v;
  const why = copy.why;
  const note = clashes >= 2 ? clashes + ' overlaps caught at the claim instead of at the merge.' : copy.note;
  const tone = copy.tone;
  const vEl = document.querySelector('[data-need-verdict]');
  const whyEl = document.querySelector('[data-need-why]');
  const noteEl = document.querySelector('[data-need-note]');
  const card = document.querySelector('[data-need-card]');
  if (vEl) { vEl.textContent = verdict; vEl.style.color = tone === 'yes' ? 'var(--cv-success)' : tone === 'soon' ? 'var(--cv-warning)' : 'var(--cv-text-primary)'; }
  if (whyEl) whyEl.textContent = why;
  if (noteEl) noteEl.textContent = note;
  if (card) card.style.borderColor = tone === 'yes' ? 'color-mix(in oklch, var(--cv-success) 34%, transparent)' : tone === 'soon' ? 'color-mix(in oklch, var(--cv-warning) 34%, transparent)' : 'var(--cv-border-hairline)';
}

// ── marquee (harness cards rail: idle drift, drag/flick, friction sparks, combo readout) ──
// a re-mount must not leave the previous loop running: two loops move the rail twice as fast
let marqTeardown = null;
let marqRaf = null;
let onMarqResize = null;

function initMarquee() {
  if (marqTeardown) { marqTeardown(); marqTeardown = null; }
  if (marqRaf) { cancelAnimationFrame(marqRaf); marqRaf = null; }
  if (onMarqResize) { window.removeEventListener('resize', onMarqResize); onMarqResize = null; }
  const track = document.querySelector('[data-marq-track]');
  const wrap = track && track.parentElement;
  if (!track || !wrap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  track.style.animation = 'none';
  const half = () => track.scrollWidth / 2 || 1;
  let base = -half() / 44000;
  let x = 0, v = base, last = performance.now();
  let dragging = false, lastPX = 0, lastPT = 0, vDrag = 0, moved = 0;

  // friction sparks: past a hard flick the rail throws them off its top and bottom edges
  const host = wrap.parentElement;
  if (host && getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const layer = document.createElement('div');
  layer.setAttribute('data-marq-sparks', '');
  layer.style.cssText = 'position: absolute; pointer-events: none; overflow: hidden; z-index: 2';
  (host || wrap).appendChild(layer);
  const BAND = 24;
  const placeLayer = () => {
    layer.style.left = wrap.offsetLeft + 'px';
    layer.style.top = (wrap.offsetTop - BAND) + 'px';
    layer.style.width = wrap.offsetWidth + 'px';
    layer.style.height = (wrap.offsetHeight + BAND * 2) + 'px';
  };
  placeLayer();

  const sparks = [];
  for (let i = 0; i < 48; i++) {
    const el = document.createElement('span');
    el.style.cssText = 'position: absolute; left: 0; top: 0; width: 3px; height: 1.5px; border-radius: 1px; transform-origin: center; background: var(--cv-warning); box-shadow: 0 0 5px color-mix(in oklch, var(--cv-warning) 65%, transparent); opacity: 0; will-change: transform, opacity';
    layer.appendChild(el);
    sparks.push({ el, life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0 });
  }
  let emit = 0;
  const SPARK_MIN = 0.8;

  const spawnSpark = (speed, dir) => {
    const p = sparks.find((q) => q.life <= 0);
    if (!p) return;
    const h = wrap.offsetHeight;
    const top = Math.random() < 0.5;
    p.x = Math.random() * wrap.offsetWidth;
    p.y = BAND + (top ? 0 : h);
    // a flick can hand over an enormous velocity; the streak reads the same past 3px/ms
    p.vx = dir * Math.min(speed, 3) * (0.25 + Math.random() * 0.6);
    p.vy = (top ? -1 : 1) * (0.03 + Math.random() * 0.09);
    p.max = 240 + Math.random() * 300;
    p.life = p.max;
  };

  const stepSparks = (dt, speed, dir) => {
    if (speed > SPARK_MIN) {
      emit += Math.min(1, (speed - SPARK_MIN) / 1.6) * dt * 0.1;
      while (emit >= 1) { spawnSpark(speed, dir); emit -= 1; }
    } else {
      emit = 0;
    }
    const mid = BAND + wrap.offsetHeight / 2;
    const w = wrap.offsetWidth;
    sparks.forEach((p) => {
      if (p.life <= 0) {
        if (p.el.style.opacity !== '0') p.el.style.opacity = '0';
        return;
      }
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -40 || p.x > w + 40) { p.life = 0; p.el.style.opacity = '0'; return; }
      p.vx *= 0.94;
      // they arc back toward the rail instead of flying off forever
      p.vy += (p.y < mid ? 0.0007 : -0.0007) * dt;
      const k = Math.max(0, p.life / p.max);
      p.el.style.opacity = (k * k).toFixed(3);
      p.el.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0) scaleX(' + (1 + Math.abs(p.vx) * 3.2).toFixed(2) + ')';
    });
  };

  // combo readout: spinning the rail hard racks up cards, and letting it slow breaks the run
  const combo = document.createElement('div');
  combo.setAttribute('data-marq-combo', '');
  combo.style.cssText = 'position: absolute; top: 24px; right: 28px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; pointer-events: none; opacity: 0; transform: translateY(-6px); transition: opacity 200ms cubic-bezier(0.2,0,0,1), transform 200ms cubic-bezier(0.2,0,0,1); z-index: 3';
  const comboNum = document.createElement('div');
  comboNum.style.cssText = "display: flex; align-items: baseline; gap: 2px; font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-variant-numeric: tabular-nums; line-height: 1; color: var(--cv-accent); transform-origin: 100% 100%; transition: transform 120ms cubic-bezier(0.2,0,0,1)";
  const comboX = document.createElement('span');
  comboX.style.cssText = 'font-size: 17px; opacity: 0.6';
  comboX.textContent = '×';
  const comboVal = document.createElement('span');
  comboVal.style.cssText = 'font-size: 34px; font-weight: 500; letter-spacing: -0.03em';
  comboVal.textContent = '0';
  comboNum.appendChild(comboX); comboNum.appendChild(comboVal);
  const comboLab = document.createElement('span');
  comboLab.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--cv-text-muted)";
  comboLab.textContent = 'combo';
  const comboDrain = document.createElement('span');
  comboDrain.style.cssText = 'width: 54px; height: 2px; border-radius: 2px; background: var(--cv-accent); transform-origin: 100% 50%; transform: scaleX(1)';
  const comboBestEl = document.createElement('span');
  comboBestEl.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cv-text-muted); opacity: 0";
  comboBestEl.textContent = 'best 0';
  combo.appendChild(comboNum); combo.appendChild(comboLab); combo.appendChild(comboDrain); combo.appendChild(comboBestEl);
  (host || wrap).appendChild(combo);

  const CARD = 248, COMBO_MIN = 1.05, GRACE = 460;
  let comboN = 0, comboBest = 0, comboAcc = 0, comboIdle = 0, comboOn = false, comboPopT = 0;

  const comboTier = (spd) => (spd > 3.3 ? 3 : spd > 2.1 ? 2 : 1);
  const showCombo = () => {
    if (comboOn) return;
    comboOn = true;
    combo.style.opacity = '1';
    combo.style.transform = 'none';
  };
  const breakCombo = () => {
    if (comboN > comboBest) {
      comboBest = comboN;
      comboBestEl.textContent = 'best ' + comboBest;
      comboBestEl.style.opacity = '0.75';
    }
    comboN = 0; comboAcc = 0; comboOn = false;
    combo.style.opacity = '0';
    combo.style.transform = 'translateY(-6px)';
    comboLab.textContent = 'combo';
    comboLab.style.color = 'var(--cv-text-muted)';
    comboNum.style.color = 'var(--cv-accent)';
    comboDrain.style.background = 'var(--cv-accent)';
  };

  const stepCombo = (dt, spd) => {
    if (spd > COMBO_MIN) {
      comboIdle = 0;
      comboAcc += spd * dt;
      const tier = comboTier(spd);
      while (comboAcc >= CARD) {
        comboAcc -= CARD;
        comboN += tier;
        comboPopT = 120;
        comboNum.style.transform = 'scale(1.16)';
      }
      // the top tier borrows the sparks' colour, so the two read as the same threshold
      const hot = tier === 3;
      comboLab.textContent = hot ? 'max spin' : tier === 2 ? 'combo ×2' : 'combo';
      comboLab.style.color = hot ? 'var(--cv-warning)' : 'var(--cv-text-muted)';
      comboNum.style.color = hot ? 'var(--cv-warning)' : 'var(--cv-accent)';
      comboDrain.style.background = hot ? 'var(--cv-warning)' : 'var(--cv-accent)';
      comboDrain.style.transform = 'scaleX(1)';
      if (comboN > 0) { comboVal.textContent = String(comboN); showCombo(); }
    } else if (comboOn) {
      comboIdle += dt;
      comboDrain.style.transform = 'scaleX(' + Math.max(0, 1 - comboIdle / GRACE).toFixed(3) + ')';
      if (comboIdle >= GRACE) breakCombo();
    }
    if (comboPopT > 0) {
      comboPopT -= dt;
      if (comboPopT <= 0) comboNum.style.transform = 'none';
    }
  };

  onMarqResize = () => { base = -half() / 44000; placeLayer(); };
  window.addEventListener('resize', onMarqResize, { passive: true });

  const frame = (t) => {
    const dt = Math.min(64, t - last);
    last = t;
    if (!dragging) {
      // exponential pull toward base speed: a hard flick bleeds off over about a second
      v += (base - v) * (1 - Math.exp(-dt / 480));
      x += v * dt;
    }
    const h = half();
    x = ((x % h) + h) % h - h;
    track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    const live = dragging ? vDrag : v;
    stepSparks(dt, Math.abs(live), live < 0 ? -1 : 1);
    stepCombo(dt, Math.abs(live));
    marqRaf = requestAnimationFrame(frame);
  };
  marqRaf = requestAnimationFrame(frame);

  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    // a drag must not start a text selection, or the release lands on highlighted copy
    e.preventDefault();
    dragging = true; moved = 0;
    lastPX = e.clientX; lastPT = performance.now(); vDrag = 0;
    wrap.style.cursor = 'grabbing';
    try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* mouse fallback */ }
  };
  const move = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastPX;
    const now = performance.now();
    const dt = Math.max(8, now - lastPT);
    x += dx;
    moved += Math.abs(dx);
    // smoothed so a jittery last frame cannot throw the rail
    vDrag = vDrag * 0.35 + (dx / dt) * 0.65;
    lastPX = e.clientX; lastPT = now;
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    wrap.style.cursor = 'grab';
    const stale = performance.now() - lastPT > 90;
    v = (stale || moved < 3) ? base : Math.max(-5, Math.min(5, vDrag));
  };
  wrap.addEventListener('pointerdown', down);
  wrap.addEventListener('pointermove', move, { passive: true });
  wrap.addEventListener('pointerup', up);
  wrap.addEventListener('pointercancel', up);
  wrap.addEventListener('lostpointercapture', up);
  marqTeardown = () => {
    if (layer.parentElement) layer.parentElement.removeChild(layer);
    if (combo.parentElement) combo.parentElement.removeChild(combo);
    wrap.removeEventListener('pointerdown', down);
    wrap.removeEventListener('pointermove', move);
    wrap.removeEventListener('pointerup', up);
    wrap.removeEventListener('pointercancel', up);
    wrap.removeEventListener('lostpointercapture', up);
  };
}

// ── verdict stage (edit / push / apply demo cards) ──────────────────────
// one request at a time: it slides in, Coven stamps its answer, it slides out
let vOn = false;
let vT = null;
let onVerdictResize = null;

function runVerdicts() {
  const stage = document.querySelector('[data-verdict-stage]');
  if (!stage) return;
  const cards = Array.from(stage.querySelectorAll('[data-verdict-card]'));
  const dots = Array.from(stage.querySelectorAll('[data-verdict-dot]'));
  if (!cards.length) return;
  const stampOf = (c) => c.querySelector('[data-verdict-stamp]');

  // the cards are all absolutely positioned, so the stage has to be told how tall the
  // tallest one is -- measured live, since the reason line wraps at narrow widths
  const fit = () => {
    const tall = cards.reduce((m, c) => Math.max(m, Array.from(c.children)
      .reduce((h, el) => Math.max(h, el.offsetHeight), 0)), 0);
    if (tall) stage.style.minHeight = Math.ceil(tall + 54) + 'px';
  };
  fit();
  onVerdictResize = fit;
  window.addEventListener('resize', fit, { passive: true });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const c = cards[0], st = stampOf(c);
    c.style.opacity = '1'; c.style.transform = 'none';
    if (st) { st.style.opacity = '1'; st.style.transform = 'rotate(-8deg)'; }
    if (dots[0]) dots[0].style.opacity = '1';
    return;
  }

  const wait = (ms) => new Promise((res) => { vT = setTimeout(res, ms); });
  let i = 0;
  const run = async () => {
    const c = cards[i % cards.length];
    const st = stampOf(c);
    dots.forEach((d, n) => { d.style.opacity = n === i % cards.length ? '0.9' : '0.28'; });

    c.style.transition = 'none';
    c.style.opacity = '0';
    c.style.transform = 'translateX(30px)';
    if (st) { st.style.transition = 'none'; st.style.opacity = '0'; st.style.transform = 'rotate(-8deg) scale(1.75)'; }
    void c.offsetWidth;

    c.style.transition = 'opacity 420ms cubic-bezier(0.2,0,0,1), transform 620ms cubic-bezier(0.16,0.84,0.24,1)';
    c.style.opacity = '1';
    c.style.transform = 'translateX(0)';
    await wait(660);

    // the stamp lands hard, then settles -- the overshoot is what sells it
    if (st) {
      st.style.transition = 'opacity 90ms linear, transform 280ms cubic-bezier(0.2,1.5,0.35,1)';
      st.style.opacity = '1';
      st.style.transform = 'rotate(-8deg) scale(1)';
    }
    await wait(1950);

    c.style.transition = 'opacity 340ms cubic-bezier(0.4,0,1,1), transform 480ms cubic-bezier(0.4,0,1,1)';
    c.style.opacity = '0';
    c.style.transform = 'translateX(-30px)';
    await wait(400);

    i = (i + 1) % cards.length;
    if (vOn) run();
  };
  vOn = true;
  run();
}

// ── day timeline (familiar learns a repo) ────────────────────────────────
// the timeline reads one day at a time: the others recede, and the focused day builds
// its headline, then its note, then its harnesses
let dayT = null;

function runDays() {
  const entries = Array.from(document.querySelectorAll('[data-day-entry]'));
  if (!entries.length) return;
  const rowsOf = (e) => Array.from(e.querySelectorAll('[data-day-row]'));

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    entries.forEach((e) => { e.style.opacity = '1'; rowsOf(e).forEach((r) => { r.style.opacity = '1'; r.style.transform = 'none'; }); });
    return;
  }

  let i = 0;
  const paint = () => {
    entries.forEach((e, n) => {
      const on = n === i;
      e.style.opacity = on ? '1' : '0.16';
      const headline = e.querySelector('[data-day-row] p');
      if (headline) headline.style.transform = on ? 'scale(1.14)' : 'scale(1)';
      const rows = rowsOf(e);
      if (!on) {
        rows.forEach((r) => { r.style.transitionDelay = '0ms'; r.style.opacity = '1'; r.style.transform = 'none'; });
        return;
      }
      rows.forEach((r) => {
        r.style.transition = 'none';
        r.style.opacity = '0';
        r.style.transform = 'translateY(5px)';
      });
      void e.offsetWidth;
      rows.forEach((r, k) => {
        r.style.transition = 'opacity 420ms cubic-bezier(0.2,0,0,1), transform 520ms cubic-bezier(0.16,0.84,0.24,1)';
        r.style.transitionDelay = (k * 150) + 'ms';
        r.style.opacity = '1';
        r.style.transform = 'translateY(0)';
      });
    });
    i = (i + 1) % entries.length;
    dayT = setTimeout(paint, 3400);
  };
  paint();
}

// ── session demo (harness / process / record) ────────────────────────────
let sessOn = false;
let sessT = null;

function runSession() {
  const panel = document.querySelector('[data-session-demo]');
  if (!panel) return;
  const phase = panel.querySelector('[data-sess-phase]');
  const sweep = panel.querySelector('[data-sess-sweep]');
  const wave = panel.querySelector('[data-proc-wave]');
  const bars = Array.from(panel.querySelectorAll('[data-proc-bar]'));
  const links = Array.from(panel.querySelectorAll('[data-proc-link]'));
  const nodeOf = (k) => panel.querySelector('[data-proc-node="' + k + '"]');
  const rowOf = (k) => panel.querySelector('[data-proc-state="' + k + '"]');

  const HAIR = 'var(--cv-border-hairline)';
  const SUCCESS = 'var(--cv-success)';
  const DANGER = 'var(--cv-danger)';
  const ACCENT = 'var(--cv-accent)';
  const MUTED = 'var(--cv-text-muted)';

  const tintNode = (k, tone, dim) => {
    const n = nodeOf(k);
    if (!n) return;
    n.style.borderColor = tone === HAIR ? HAIR : 'color-mix(in oklch, ' + tone + ' 55%, transparent)';
    n.style.background = tone === HAIR ? 'var(--cv-bg-panel)' : 'color-mix(in oklch, ' + tone + ' 11%, var(--cv-bg-panel))';
    const icon = n.firstElementChild;
    if (icon) { icon.style.color = tone === HAIR ? 'var(--cv-text-secondary)' : tone; icon.style.opacity = dim ? '0.28' : '1'; }
  };
  const setLinks = (tone, flowing) => {
    links.forEach((l) => {
      l.style.backgroundImage = 'repeating-linear-gradient(90deg, ' + tone + ' 0 5px, transparent 5px 18px)';
      l.style.animationPlayState = flowing ? 'running' : 'paused';
      l.style.opacity = flowing ? '1' : '0.4';
    });
  };
  const setWave = (tone, live) => {
    if (wave) wave.style.color = tone;
    bars.forEach((b) => {
      b.style.animationPlayState = live ? 'running' : 'paused';
      if (!live) b.style.transform = 'scaleY(0.06)';
      else b.style.transform = '';
    });
  };
  const mark = (key, tone) => {
    ['running', 'lost', 'terminated', 'rebooting', 'resuming'].forEach((k) => {
      const row = rowOf(k);
      if (!row) return;
      const on = k === key;
      row.style.opacity = on ? '1' : '0.3';
      const dot = row.querySelector('[data-proc-state-dot]');
      const label = row.lastElementChild;
      if (dot) {
        dot.style.background = on ? tone : MUTED;
        dot.style.boxShadow = on ? '0 0 0 3px color-mix(in oklch, ' + tone + ' 18%, transparent)' : 'none';
      }
      if (label) label.style.color = on ? tone : 'var(--cv-text-secondary)';
    });
    if (phase) { phase.textContent = key === 'lost' ? 'connection lost' : key; phase.style.color = tone; }
  };

  const wait = (ms) => new Promise((res) => { sessT = setTimeout(res, ms); });

  const cycle = async () => {
    // running: current flows both ways and the process is alive
    panel.style.borderColor = HAIR;
    tintNode('harness', SUCCESS); tintNode('process', SUCCESS); tintNode('record', SUCCESS);
    setLinks(SUCCESS, true); setWave(SUCCESS, true);
    if (sweep) { sweep.style.opacity = '0'; sweep.style.transform = 'scaleX(0)'; }
    mark('running', SUCCESS);
    await wait(2900);

    // the machine drops: the link to the record breaks first
    panel.style.borderColor = 'color-mix(in oklch, var(--cv-danger) 45%, transparent)';
    tintNode('process', DANGER);
    setLinks(DANGER, false); setWave(DANGER, false);
    mark('lost', DANGER);
    await wait(1200);

    // terminated: the process is gone, the record is not
    tintNode('harness', HAIR); tintNode('process', HAIR, true); tintNode('record', SUCCESS);
    setLinks(HAIR, false);
    if (wave) wave.style.color = MUTED;
    mark('terminated', DANGER);
    await wait(1400);

    // rebooting
    panel.style.borderColor = 'color-mix(in oklch, var(--cv-accent) 40%, transparent)';
    if (sweep) { sweep.style.opacity = '1'; sweep.style.transform = 'scaleX(1)'; }
    tintNode('harness', ACCENT);
    mark('rebooting', ACCENT);
    await wait(1300);
    if (sweep) sweep.style.opacity = '0';

    // resuming: a new process attaches to the record that was kept
    tintNode('process', ACCENT);
    setLinks(ACCENT, true); setWave(ACCENT, true);
    mark('resuming', ACCENT);
    await wait(1500);

    if (sessOn) cycle();
  };

  sessOn = true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    tintNode('harness', SUCCESS); tintNode('process', SUCCESS); tintNode('record', SUCCESS);
    setLinks(SUCCESS, false); setWave(SUCCESS, false);
    mark('running', SUCCESS);
    return;
  }
  cycle();
}

// ── page motion: reveals the shared module doesn't cover, plus the
// architecture scrub and the tape comparison ─────────────────────────────
let timer = null;
let scrubTimer = null;

function initPageMotion() {
  const q = (s) => Array.from(document.querySelectorAll(s));
  const CUB = 'cubic-bezier(0.2,0,0,1)';

  if (timer) { clearInterval(timer); timer = null; }
  if (scrubTimer) { clearInterval(scrubTimer); scrubTimer = null; }

  const archCards = q('[data-arch-card]');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    archCards.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
    runSession();
    const ulNow = document.querySelector('[data-hero-underline]');
    if (ulNow) { ulNow.style.transition = 'none'; ulNow.style.transform = 'scaleX(1)'; }
    return;
  }

  // the underline draws itself once the hero copy has settled
  const ul = document.querySelector('[data-hero-underline]');
  if (ul) later(() => { ul.style.transform = 'scaleX(1)'; }, 760);

  const pending = [];
  const onceVisible = (el, cb) => pending.push({ trigger: el, play: cb });

  const prep = (el, from, dur) => {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = from;
    void el.offsetWidth;
    el.style.transition = 'opacity ' + dur + 's ' + CUB + ', transform ' + dur + 's ' + CUB;
  };
  const show = (el, delay) => later(() => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  }, delay || 0);

  const arch = document.querySelector('#architecture');
  if (arch) {
    const cards = Array.from(arch.querySelectorAll('[data-arch-card]'));
    cards.forEach((el) => prep(el, 'translateY(24px)', 0.7));
    onceVisible(arch, () => cards.forEach((el, i) => show(el, i * 130)));
  }

  const needStage = document.querySelector('[data-need-rows]');
  if (needStage) onceVisible(needStage, () => runNeed());

  const incSec = document.getElementById('incident');
  const tapes = incSec ? Array.from(incSec.querySelectorAll('[data-tape]')) : [];
  if (incSec && tapes.length) {
    // IntersectionObserver reports the whole document as visible inside the preview host, which
    // played the pair on load, so visibility is measured against the viewport directly
    const inView = () => {
      const r = tapes[0].getBoundingClientRect();
      return r.top < window.innerHeight * 0.82 && r.bottom > window.innerHeight * 0.12;
    };
    let shown = false;
    const runTapes = () => {
      incSec.setAttribute('data-run', 'on');
      // cancel + play restarts from zero, so returning to the section replays the pair
      incSec.querySelectorAll('[data-sweep], [data-tape] span').forEach((el) => {
        if (el.getAnimations) el.getAnimations().forEach((an) => { an.cancel(); an.play(); });
      });
    };
    const tapeScan = () => {
      const now = inView();
      if (now && !shown) { shown = true; runTapes(); }
      else if (!now && shown) { shown = false; incSec.removeAttribute('data-run'); }
    };
    window.addEventListener('scroll', tapeScan, { passive: true });
    window.addEventListener('resize', tapeScan, { passive: true });
    tapeScan();
  }

  const sessDemo = document.querySelector('[data-session-demo]');
  if (sessDemo) onceVisible(sessDemo, () => runSession());

  initMarquee();

  const firstDay = document.querySelector('[data-day-entry]');
  if (firstDay && firstDay.parentElement) onceVisible(firstDay.parentElement, () => runDays());

  const verdictStage = document.querySelector('[data-verdict-stage]');
  if (verdictStage) onceVisible(verdictStage, () => runVerdicts());

  const rail = document.querySelector('[data-rail]');
  const tocs = q('[data-toc]').map((link) => ({ link, panel: document.getElementById(link.dataset.toc) }))
    .filter((t) => t.panel);
  if (rail && rail.parentElement) {
    rail.style.transformOrigin = 'top center';
    rail.style.transform = 'scaleY(0)';
    rail.style.transition = 'transform 160ms linear';
  }

  const dayDots = q('[data-day-dot]');
  tocs.forEach((t) => {
    t.panel.style.transition = 'border-color 260ms cubic-bezier(0.2,0,0,1), box-shadow 260ms cubic-bezier(0.2,0,0,1)';
  });

  const archPanel = document.querySelector('[data-arch]');
  const flowDown = document.querySelector('[data-flow="down"]');
  const flowUp = document.querySelector('[data-flow="up"]');

  const scrub = () => {
    const vh = window.innerHeight;

    if (archPanel) {
      const ar = archPanel.getBoundingClientRect();
      const ap = Math.max(0, Math.min(1, (vh * 0.82 - ar.top) / Math.max(1, ar.height * 0.7)));
      const seg = (from, to) => Math.max(0, Math.min(1, (ap - from) / (to - from)));
      const dn = seg(0.10, 0.45);
      const up = seg(0.50, 0.88);
      if (flowDown) flowDown.style.transform = 'scaleY(' + dn + ')';
      if (flowUp) flowUp.style.transform = 'scaleY(' + up + ')';
      archCards.forEach((c) => {
        const n = Number(c.dataset.archCard);
        const lit = n === 1 ? true : (n === 0 ? ap > 0.04 : dn > 0.98);
        const label = c.querySelector('[data-arch-label]');
        if (n === 1) return;
        c.style.borderColor = lit ? 'color-mix(in oklch, var(--cv-accent) 34%, transparent)' : 'var(--cv-border-hairline)';
        if (label) label.style.color = lit ? 'var(--cv-accent)' : 'var(--cv-text-muted)';
      });
    }

    let railP = 0;
    if (rail && rail.parentElement) {
      const r = rail.parentElement.getBoundingClientRect();
      railP = Math.max(0, Math.min(1, (vh * 0.72 - r.top) / Math.max(1, r.height * 0.85)));
      rail.style.transform = 'scaleY(' + railP.toFixed(3) + ')';
    }
    dayDots.forEach((d, i) => {
      const lit = railP > (i + 0.3) / dayDots.length;
      d.style.background = lit ? 'var(--cv-accent)' : 'var(--cv-bg-panel)';
      d.style.borderColor = lit ? 'var(--cv-accent)' : 'var(--cv-border-hairline)';
    });
    tocs.forEach((t) => {
      const r = t.panel.getBoundingClientRect();
      const active = r.top < vh * 0.55 && r.bottom > vh * 0.45;
      t.link.style.color = active ? 'var(--cv-accent)' : 'var(--cv-text-muted)';
      t.panel.style.borderColor = active ? 'color-mix(in oklch, var(--cv-accent) 45%, transparent)' : 'var(--cv-border-hairline)';
      t.panel.style.boxShadow = active ? '0 10px 30px color-mix(in oklch, var(--cv-accent) 12%, transparent)' : 'none';
    });
  };
  scrub();
  scrubTimer = every(scrub, 100);

  q('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    el.textContent = '0';
    onceVisible(el, () => {
      const t0 = Date.now();
      const id = every(() => {
        const p = Math.min(1, (Date.now() - t0) / 1200);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p === 1) clearInterval(id);
      }, 40);
    });
  });

  const tick = () => {
    const vh = window.innerHeight;
    for (let i = pending.length - 1; i >= 0; i--) {
      const r = pending[i].trigger.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > -40) pending.splice(i, 1)[0].play();
    }
    if (!pending.length && timer) { clearInterval(timer); timer = null; }
  };
  tick();
  timer = every(tick, 120);

  later(() => {
    while (pending.length) pending.pop().play();
    if (timer) { clearInterval(timer); timer = null; }
  }, 5000);
}

initActions();
initTheme();
initNav();
initDownloads();
initMotion();
initBoard();
initPageMotion();
wireHarnessRail();
