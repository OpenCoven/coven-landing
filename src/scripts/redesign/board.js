// The live board demo: a fake multi-familiar session feed (rail picker, diff
// counters, scrolling tool-call logs), the overlap banner + attention chip
// with an undoable resolve flow, and the per-familiar window stack (profile,
// surface/claim, live state, diff) opened from the sessions table.

import { register } from './actions.js';

const timers = [];
const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };

// ── rail / project picker ────────────────────────────────────────────────
let _proj = null;
let _rail = null;
let _railAuto = false;
let _railSettle = null;
let _railAutoT = null;

// ── overlap banner + attention chip ──────────────────────────────────────
let _resolved = null;
let _overlapSnap = null;
let _overlapShown = false;
let _attT = null;

// ── board reveal (diff ticks + the scrolling tool logs) ──────────────────
let _ticksRan = false;
let _feedT = null;

// ── window stack / routing ───────────────────────────────────────────────
let _routeT = null;
let _stack = [];
let _ctx = null;
let _view = null;

// ── familiar profile window (tags, commit grid, memory graph) ────────────
let _winFam = null;
let _memD = null;
let _memWin = null;
let _memSel = null;
let _memNodes = null;
let _memEdges = null;
let _memResize = null;
let _memFitT = null;
let _memFitting = false;
let _gridX = 0;

// ── diff window ───────────────────────────────────────────────────────────
let _diffFile = 0;


const pickProject = (e) => {
  pickProjectId(e.currentTarget.dataset.boardProj);
};

// the rail decides which project's sessions the board is showing


function pickProjectId(id) {
  _proj = id;
  Array.from(document.querySelectorAll('[data-board-proj]')).forEach((b) => {
    const on = b.dataset.boardProj === id;
    b.style.background = on ? 'var(--cv-accent-soft)' : 'transparent';
    const bar = b.querySelector('[data-board-bar]');
    if (bar) bar.style.background = on ? 'var(--cv-accent)' : 'transparent';
  });
  let shown = 0;
  Array.from(document.querySelectorAll('[data-row][data-proj]')).forEach((r) => {
    const on = r.dataset.proj === id;
    r.style.display = on ? 'grid' : 'none';
    if (on) shown++;
  });
  const count = document.querySelector('[data-board-count]');
  if (count) count.textContent = shown + (shown === 1 ? ' session' : ' sessions');
  const path = document.querySelector('[data-board-path]');
  if (path) path.textContent = '~/dev/' + id;
  const banner = document.querySelector('[data-overlap-banner]');
  const attention = document.querySelector('[data-attention]');
  const only = id === 'opencoven';
  if (banner) banner.style.display = only ? 'flex' : 'none';
  setAttention(only && !_resolved && _overlapShown);
  railTo(id);
}

// phone and tablet: the rail is a swipe strip. Sliding it settles on a project
// instead of just scrolling past it, and tapping one brings its chip into view.


function initRailSwipe() {
  const chip = document.querySelector('[data-board-proj]');
  const rail = chip && chip.parentElement;
  if (!rail) return;
  _rail = rail;
  rail.addEventListener('scroll', () => {
    if (_railAuto || window.innerWidth >= 1080) return;
    if (_railSettle) clearTimeout(_railSettle);
    _railSettle = setTimeout(() => {
      const chips = Array.from(rail.querySelectorAll('[data-board-proj]'));
      let best = null;
      let bestD = Infinity;
      chips.forEach((c) => {
        const d = Math.abs(c.offsetLeft - rail.scrollLeft);
        if (d < bestD) { bestD = d; best = c; }
      });
      if (best && best.dataset.boardProj !== _proj) pickProjectId(best.dataset.boardProj);
    }, 150);
  }, { passive: true });
}



function railTo(id) {
  const rail = _rail;
  if (!rail || window.innerWidth >= 1080) return;
  if (rail.scrollWidth <= rail.clientWidth + 4) return;
  const btn = rail.querySelector('[data-board-proj="' + id + '"]');
  if (!btn) return;
  const left = Math.max(0, Math.min(btn.offsetLeft, rail.scrollWidth - rail.clientWidth));
  if (Math.abs(rail.scrollLeft - left) < 2) return;
  _railAuto = true;
  if (rail.scrollTo) rail.scrollTo({ left: left, behavior: 'smooth' });
  else rail.scrollLeft = left;
  if (_railAutoT) clearTimeout(_railAutoT);
  _railAutoT = setTimeout(() => { _railAuto = false; }, 460);
}

// "codex · gpt-5.2 codex" said codex twice: the harness leads, the model drops any
// word the harness already carries


function modelLine(harness, model) {
  const own = String(harness).toLowerCase().split(/\s+/);
  const rest = String(model).split(/\s+/).filter((w) => own.indexOf(w.toLowerCase()) < 0).join(' ');
  return harness + ' · ' + (rest || model);
}

// out of the layout entirely when there is nothing to flag, so the count sits at the edge


function setAttention(live) {
  const chip = document.querySelector('[data-attention]');
  if (!chip) return;
  if (_attT) clearTimeout(_attT);
  chip.style.pointerEvents = live ? 'auto' : 'none';
  if (live) {
    chip.style.display = 'inline-flex';
    requestAnimationFrame(() => { chip.style.opacity = '1'; });
  } else {
    chip.style.opacity = '0';
    _attT = setTimeout(() => { chip.style.display = 'none'; }, 300);
  }
}



const resolveOverlap = (e) => {
  e.stopPropagation();
  applyResolve(e.currentTarget.dataset.resolve);
};



const pickConflictTab = (e) => {
  const id = e.currentTarget.dataset.cfTab;
  Array.from(document.querySelectorAll('[data-cf-tab]')).forEach((b) => {
    const on = b.dataset.cfTab === id;
    b.style.background = on ? 'var(--cv-bg-raised)' : 'transparent';
    b.style.color = on ? 'var(--cv-text-primary)' : 'var(--cv-text-muted)';
    b.style.borderColor = on ? 'color-mix(in oklch, var(--cv-accent) 40%, transparent)' : 'transparent';
  });
  Array.from(document.querySelectorAll('[data-cf-panel]')).forEach((p) => {
    const on = p.dataset.cfPanel === id;
    if (!on) { p.style.display = 'none'; return; }
    p.style.display = 'block';
    p.style.opacity = '0';
    p.style.transform = 'translateY(5px)';
    p.style.transition = 'opacity 260ms cubic-bezier(0.2,0,0,1), transform 300ms cubic-bezier(0.2,0,0,1)';
    requestAnimationFrame(() => { p.style.opacity = '1'; p.style.transform = 'none'; });
  });
};

// your own instruction counts as a resolution: both familiars get it


const resolveWithNote = (e) => {
  e.stopPropagation();
  const input = document.querySelector('[data-cf-note]');
  const text = input && input.value.trim() ? input.value.trim() : input && input.placeholder;
  showView('board');
  later(() => applyResolve('note', text), 520);
};



const openConflict = (e) => {
  if (e) e.stopPropagation();
  _stack = ['conflict'];
  showView('conflict');
};

// deciding from the deep dive resolves it and drops you back on the board


const resolveFromDive = (e) => {
  e.stopPropagation();
  const mode = e.currentTarget.dataset.resolve;
  showView('board');
  later(() => applyResolve(mode), 520);
};




const undoResolve = (e) => {
  e.stopPropagation();
  const banner = document.querySelector('[data-overlap-banner]');
  const attention = document.querySelector('[data-attention]');
  if (banner && _overlapSnap) {
    banner.innerHTML = _overlapSnap.banner;
    banner.style.cssText = _overlapSnap.bannerCss;
    // restored from a snapshot string, so the template's bound handler is gone
    Array.from(banner.querySelectorAll('[data-resolve]')).forEach((b) => {
      b.addEventListener('click', resolveOverlap);
    });
  }
  if (attention && _overlapSnap) {
    attention.innerHTML = _overlapSnap.attention;
    attention.style.cssText = _overlapSnap.attentionCss;
  }
  const log = document.querySelector('[data-sage-log]');
  if (log && _overlapSnap) {
    log.dataset.lines = _overlapSnap.lines;
    log.textContent = 'holding · waiting on you';
    log.style.color = 'var(--cv-text-secondary)';
  }
  const claim = document.querySelector('[data-claim-overlap]');
  if (claim) {
    claim.textContent = 'ui/composer';
    claim.style.color = 'var(--cv-warning)';
    claim.style.borderColor = 'color-mix(in oklch, var(--cv-warning) 45%, transparent)';
    claim.style.background = 'color-mix(in oklch, var(--cv-warning) 10%, transparent)';
  }
  const row = document.querySelector('[data-row-overlap]');
  if (row) row.style.background = 'color-mix(in oklch, var(--cv-warning) 8%, transparent)';
  const cell = document.querySelector('[data-state-cell]');
  if (cell) {
    cell.style.color = 'var(--cv-warning)';
    const dot = cell.querySelector('[data-state-dot]');
    const txt = cell.querySelector('[data-state-text]');
    if (dot) { dot.style.background = 'var(--cv-warning)'; dot.style.animation = 'cvWarn 2.2s ease-out infinite'; }
    if (txt) txt.textContent = 'holding';
  }
  _resolved = null;
};




function applyResolve(mode, noteText) {
  const banner = document.querySelector('[data-overlap-banner]');
  const attention = document.querySelector('[data-attention]');
  if (!banner) return;
  if (!_overlapSnap) {
    _overlapSnap = {
      banner: banner.innerHTML,
      bannerCss: banner.style.cssText,
      attention: attention ? attention.innerHTML : '',
      attentionCss: attention ? attention.style.cssText : '',
      lines: (document.querySelector('[data-sage-log]') || {}).dataset
        ? document.querySelector('[data-sage-log]').dataset.lines : '',
    };
  }
  _resolved = mode;
  const mono = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none;";

  // Sage stops holding: it either narrows its claim or lets the surface go
  const claim = document.querySelector('[data-claim-overlap]');
  if (claim) {
    if (mode !== 'note') claim.textContent = mode === 'split' ? 'ui/composer/tests' : 'api/tests';
    claim.style.color = 'var(--cv-text-secondary)';
    claim.style.borderColor = 'var(--cv-border-hairline)';
    claim.style.background = 'transparent';
  }
  const log = document.querySelector('[data-sage-log]');
  if (log) {
    const line = mode === 'split' ? 'scoped to tests · resuming' : mode === 'note' ? 'took your note · resuming' : 'released ui/composer · picked up api/tests';
    log.dataset.lines = line;
    log.style.opacity = '0';
    later(() => { log.textContent = line; log.style.color = 'var(--cv-text-secondary)'; log.style.opacity = '1'; }, 200);
  }
  const row = document.querySelector('[data-row-overlap]');
  if (row) {
    row.style.background = 'color-mix(in oklch, var(--cv-accent) 10%, transparent)';
    later(() => { row.style.background = 'transparent'; }, 900);
  }
  const cell = document.querySelector('[data-state-cell]');
  if (cell) {
    cell.style.color = 'var(--cv-success)';
    const dot = cell.querySelector('[data-state-dot]');
    const txt = cell.querySelector('[data-state-text]');
    if (dot) { dot.style.background = 'var(--cv-success)'; dot.style.animation = 'cvLive 2.2s ease-out infinite'; }
    if (txt) txt.textContent = 'working';
  }
  if (attention) {
    // nothing to look at any more, so it stops being a door
    attention.style.pointerEvents = 'none';
    attention.style.cursor = 'default';
    attention.innerHTML = '<span style="width: 5px; height: 5px; border-radius: 999px; background: var(--cv-success)"></span>all clear';
    attention.style.color = 'var(--cv-success)';
    attention.style.borderColor = 'color-mix(in oklch, var(--cv-success) 45%, transparent)';
    attention.style.background = 'color-mix(in oklch, var(--cv-success) 10%, transparent)';
  }

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const detail = mode === 'split'
    ? 'Split · Hexi keeps <span style="' + mono + ' font-size: 13px">ui/composer</span>, Sage takes the tests. Both resumed.'
    : mode === 'note'
    ? 'Your call · &ldquo;' + esc(noteText) + '&rdquo; — both familiars have it.'
    : 'Handed to Hexi · Sage released the claim and moved to <span style="' + mono + ' font-size: 13px">api/tests</span>.';
  banner.style.borderTop = '1px solid color-mix(in oklch, var(--cv-accent) 38%, transparent)';
  banner.style.background = 'color-mix(in oklch, var(--cv-accent) 8%, transparent)';
  banner.innerHTML = '<span style="' + mono + ' font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cv-accent)">Resolved</span>'
    + '<span style="font-size: 14px">' + detail + '</span>'
    + '<span style="margin-left: auto; display: flex; align-items: center; gap: 14px">'
    + '<span style="' + mono + ' font-size: 10.5px; color: var(--cv-text-muted)">written to the event log</span>'
    + '<button type="button" data-undo-resolve style="font-family: inherit; font-size: 13px; font-weight: 500; padding: 7px 14px; border-radius: 7px; border: 1px solid var(--cv-border-hairline); background: var(--cv-bg-raised); color: var(--cv-text-primary); cursor: pointer">Undo</button>'
    + '</span>';
  const undo = banner.querySelector('[data-undo-resolve]');
  if (undo) undo.addEventListener('click', undoResolve);
}


// diff counters climb once, when the board first comes into view


function runTicks() {
  if (_ticksRan) return;
  _ticksRan = true;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.from(document.querySelectorAll('[data-tick]')).forEach((el) => {
    const target = Number(el.dataset.tick);
    const prefix = el.dataset.prefix || '+';
    if (reduce) { el.textContent = prefix + target; return; }
    const t0 = Date.now();
    const id = every(() => {
      const p = Math.min(1, (Date.now() - t0) / 1100);
      el.textContent = prefix + String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p === 1) clearInterval(id);
    }, 40);
  });
}



function runBoard(instant) {
  const logs = Array.from(document.querySelectorAll('[data-log]'));
  const step = 1900;

  logs.forEach((el) => {
    const lines = (el.dataset.lines || '').split('|').filter(Boolean);
    if (!lines.length) return;
    if (instant) { el.textContent = lines[lines.length - 1]; return; }
    let i = 0;
    const advance = () => {
      i += 1;
      if (i >= lines.length) return;
      el.style.opacity = '0';
      later(() => {
        el.textContent = lines[i];
        if (lines[i].indexOf('overlap') === 0 || lines[i].indexOf('guard') === 0) {
          el.style.color = 'var(--cv-warning)';
        }
        el.style.opacity = '1';
        if (i < lines.length - 1) later(advance, step);
      }, 240);
    };
    later(advance, step);
  });

  const settle = instant ? 0 : step * 2 + 400;

  later(() => {
    if (_resolved) return;
    document.querySelectorAll('[data-row-overlap]').forEach((row) => {
      row.style.background = 'color-mix(in oklch, var(--cv-warning) 8%, transparent)';
    });
    document.querySelectorAll('[data-claim-overlap]').forEach((chip) => {
      chip.style.color = 'var(--cv-warning)';
      chip.style.borderColor = 'color-mix(in oklch, var(--cv-warning) 45%, transparent)';
      chip.style.background = 'color-mix(in oklch, var(--cv-warning) 10%, transparent)';
    });
    const cell = document.querySelector('[data-state-cell]');
    if (cell) {
      cell.style.color = 'var(--cv-warning)';
      const dot = cell.querySelector('[data-state-dot]');
      const txt = cell.querySelector('[data-state-text]');
      if (dot) { dot.style.background = 'var(--cv-warning)'; dot.style.animation = 'cvWarn 2.2s ease-out infinite'; }
      if (txt) txt.textContent = 'holding';
    }
    _overlapShown = true;
    setAttention(true);
    const banner = document.querySelector('[data-overlap-banner]');
    if (banner) { banner.style.opacity = '1'; banner.style.transform = 'none'; }
  }, settle);
}

// no invented figures: each proof item stays hidden until its own request answers



const FAM = {
  Hexi: {
    kind: 'directory · 6 files', waiting: [["Sage","since 14:19","restyle the same shell"]], sstats: [["3","claims today"],["1","contested"],["38m","average hold"]], sfiles: [["composer-shell.tsx",38,12,"2m ago"],["control-pill.tsx",21,4,"6m ago"],["composer.test.tsx",27,0,"11m ago"],["tokens.ts",0,25,"14m ago"]], guards: [["Tests pass before a commit","ui/**","commit, push","never fired"],["No force push on main","repo","git push --force","fired 2d ago"]], history: [["14:19","Sage","asked for this surface, held","warn"],["14:02","Hexi","claimed it, intent recorded","ok"],["11:20","you","split ui/composer from api/auth","muted"],["09:14","Quill","released src/shell","muted"]],
    memories: [["Tests run with vitest, never jest",5,9,[1,3],"day 004","today","seen in 9 sessions across 2 projects"],["Composer tokens live in tokens.ts",4,6,[0,2],"day 011","today","seen in 6 sessions, twice corrected by you"],["Small controls are fully rounded",3,4,[1],"day 019","2d ago","seen in 4 sessions, 1 correction"],["PR summaries stay under five lines",5,11,[0],"day 002","today","seen in 11 sessions, never contradicted"],["Ask before touching infra/",2,2,[],"day 031","6d ago","seen twice, both times from you"]], vault: [["GITHUB_TOKEN","opencoven","4m ago","push access, read only to Hexi"],["VERCEL_TOKEN","coven-cave","2d ago","preview deploys"]],
    model: 'sonnet 4.6', tags: ["interface","tests first","token thrifty"], churn: '207k', tokin: '186k in', tokout: '21k out', inPct: 90,
    projects: [["opencoven","~/dev/opencoven","14","2m",[["1:1","you","today · 14:02","42m","restyled the composer control pills"],["group","you · Sage · Charm","today · 11:20","18m","split ui/composer from api/auth"],["1:1","you","yesterday · 16:40","1h 12m","moved tokens out of the shell"]]],["coven-cave","~/dev/coven-cave","5","2d",[["1:1","you","Tue · 09:15","55m","wired the session list to the daemon"],["group","you · Mote","Mon · 14:02","26m","agreed on the socket contract"]]]],
    research: [],
    harness: 'claude code', role: 'Interface work', temper: 'Reads before it writes',
    mem: ['prefers vitest over jest', 'composer tokens live in tokens.ts', 'keeps PR summaries short'],
    surface: 'ui/composer', holder: 'Hexi', since: '14:02', intent: 'restyle the control pills',
    files: ['ui/composer/composer-shell.tsx', 'ui/composer/control-pill.tsx', 'ui/composer/composer.test.tsx'],
    stats: ['+38 −12', '+21 −4', '+27'],
    events: ['14:02 · claimed ui/composer', '14:19 · held Sage on the same surface'],
    hunk: ['@@ composer control pills', '− radius: 8px, boxShadow: elevation2', '+ radius: 999px, border: hairline', '12 tests green · 0 snapshots stale'],
    note: 'Keep the radius at 999px on the small pills.',
    state: 'working', cost: '$1.84', time: '42m', tokens: '186k in · 21k out',
    per: [['composer-shell.tsx', '96k', '14 edits'], ['control-pill.tsx', '41k', '6 edits'], ['composer.test.tsx', '28k', '3 edits']],
    feed: ['read composer-shell.tsx', 'edited the control pills', 'ran vitest · 12 passed', 'staged 4 files']
  },
  Sage: {
    kind: 'directory · 6 files', waiting: [["Sage","since 14:19","restyle the same shell"]], sstats: [["3","claims today"],["1","contested"],["38m","average hold"]], sfiles: [["composer-shell.tsx",0,0,"held"],["tokens.ts",0,0,"held"],["pill.css",0,0,"held"]], guards: [["Second claim waits for you","any surface","writes while held","fired 11m ago"],["Tests pass before a commit","ui/**","commit, push","never fired"]], history: [["14:19","Sage","asked for this surface, held","warn"],["14:02","Hexi","claimed it first","ok"],["13:48","you","compared two pill treatments","muted"]],
    reports: [{"title":"Pill radius across the ecosystem","thesis":"Fully rounded is now the default for small controls. Square corners read as legacy, and the halfway radius reads as an accident.","meta":["12 products","Mar 2 – Mar 9","hands-on audit"],"stats":[["9","fully rounded"],["2","rounded 8px"],["1","square"]],"chart":{"kind":"matrix","buckets":[["Fully rounded · 999px",9],["Rounded · 8px",2],["Square · 0px",1]]},"chartnote":"One tile per product. Measured on the smallest interactive control at 1x.","evidence":[["Linear","999px","pill on every filter chip"],["Vercel","999px","pill, 1px hairline"],["Stripe","8px","rounded, heavier shadow"],["GitHub","6px","rounded, closest to square"],["Raycast","999px","pill, no border"],["Figma","999px","pill on toolbar chips"]],"takeaways":["Take the composer pills to 999px and drop the elevation.","Keep the hairline border. Every pill in the audit that lost its border also lost its edge on light backgrounds.","Leave 8px for containers, not controls."],"method":"Twelve products opened at 1x in light theme, smallest interactive control measured from a screenshot, radius read off the rendered pixels rather than published tokens."},{"title":"Token scales that survive a redesign","thesis":"Two-tier scales held for a year. Three-tier scales drifted inside a month, and the third tier ended up unused or contradicted.","meta":["8 codebases","Feb 18 – Mar 1","git history read"],"stats":[["2","tiers that held"],["31d","median drift"],["8","codebases read"]],"chart":{"kind":"drift","months":["Jan","Feb","Mar","Apr","May","Jun"],"series":[["two tier",[0,0,1,1,1,1]],["three tier",[1,3,5,6,8,9]]]},"chartnote":"Drift counted as tokens whose value changed without the scale changing with it.","evidence":[["radix-ui","2 tiers","no drift in 11 months"],["shopify polaris","3 tiers","9 drifted values"],["atlassian","3 tiers","6 drifted, 1 tier abandoned"],["tailwind","2 tiers","stable across majors"]],"takeaways":["Keep tokens.ts at two tiers: raw scale and semantic names.","Refuse a third tier for components. The audit found no case where it survived.","Name by role, not by size, so a value change does not force a rename."],"method":"Eight public repositories, token files read from first commit to head, every value change classified as scale change or drift."}],
    memories: [["Wait when a claim is already held",4,7,[1],"day 003","today","seen in 7 sessions, learned from 2 refusals"],["Read the token scale before restyling",3,5,[0,2],"day 008","today","seen in 5 sessions"],["Show two options before committing",5,9,[1],"day 002","1d ago","seen in 9 sessions, you picked option B six times"],["Never edit tests without asking",2,3,[],"day 022","4d ago","seen three times"]], vault: [["FIGMA_TOKEN","opencoven","3h ago","read only"]],
    model: 'gpt-5.2 codex', tags: ["visual polish","researcher","plans first"], churn: '34k', tokin: '32k in', tokout: '2k out', inPct: 94,
    projects: [["opencoven","~/dev/opencoven","6","11m",[["1:1","you","today · 14:19","11m","held on ui/composer, waiting on your call"],["group","you · Hexi","today · 13:48","9m","compared two pill treatments"]]]],
    research: [["Pill radius across the ecosystem","Twelve products, nine of them fully rounded on small controls.","9 sources"],["Token scales that survive a redesign","Two-tier scales held up. Three-tier scales drifted within a month.","6 sources"]],
    harness: 'codex', role: 'Visual polish', temper: 'Plans the whole change first',
    mem: ['asks before it touches tests', 'follows the tokens file', 'waits on held claims'],
    surface: 'ui/composer', holder: 'Hexi', since: '14:19', intent: 'restyle the same shell',
    files: ['ui/composer/composer-shell.tsx', 'ui/composer/tokens.ts', 'ui/composer/pill.css'],
    stats: ['held', 'held', 'held'],
    events: ['14:19 · asked for ui/composer', '14:19 · held · Hexi is on it'],
    hunk: ['@@ nothing written yet', '− the runtime refused the claim', '+ waiting on your call', 'no files touched'],
    note: 'Hand it the tokens file instead.',
    state: 'holding', cost: '$0.21', time: '11m', tokens: '32k in · 2k out',
    per: [['composer-shell.tsx', '18k', '0 edits'], ['tokens.ts', '9k', '0 edits'], ['pill.css', '5k', '0 edits']],
    feed: ['opened composer-shell.tsx', 'planned a restyle', 'claim overlaps Hexi', 'holding · waiting on you']
  },
  Charm: {
    kind: 'directory · 9 files', waiting: [], sstats: [["2","claims today"],["0","contested"],["2h 10m","average hold"]], sfiles: [["session.ts",64,18,"4m ago"],["refresh.ts",52,12,"9m ago"],["014_refresh.sql",26,0,"31m ago"],["auth.test.ts",31,2,"38m ago"]], guards: [["Migrations need a review","migrations/**","merge","fired 31m ago"],["No secret in a prompt","repo","vault reads","never fired"]], history: [["13:41","Charm","opened PR #167","ok"],["10:02","Charm","claimed api/auth","ok"],["09:30","you","agreed who owns the session table","muted"]],
    memories: [["Rotate refresh tokens on every exchange",5,12,[1,2],"day 001","today","seen in 12 sessions, hardened after one incident"],["Migrations go in one numbered file",4,8,[0],"day 006","today","seen in 8 sessions"],["PR body carries the claim id",5,10,[0,3],"day 004","today","seen in 10 sessions, never contradicted"],["Sessions table is owned by api/auth",3,5,[2],"day 014","1d ago","agreed with Hexi and Mote in a group session"]], vault: [["AUTH0_CLIENT_SECRET","opencoven","11m ago","never enters a prompt"],["DATABASE_URL","opencoven","11m ago","migrations only"],["STRIPE_KEY","castcodes","2d ago","test mode"]],
    model: 'sonnet 4.6', tags: ["auth","migrations","writes tests"], churn: '468k', tokin: '410k in', tokout: '58k out', inPct: 88,
    projects: [["opencoven","~/dev/opencoven","22","4m",[["1:1","you","today · 10:02","2h 14m","added refresh rotation, opened PR #167"],["group","you · Hexi · Mote","today · 09:30","31m","agreed who owns the session table"]]],["castcodes","~/dev/castcodes","9","2d",[["1:1","you","Sat · 12:10","1h 48m","ported the login flow to the new runtime"]]]],
    research: [],
    harness: 'claude code', role: 'Auth and sessions', temper: 'Writes the migration first',
    mem: ['rotates refresh tokens on every login', 'migrations go in one file', 'PR body carries the claim id'],
    surface: 'api/auth', holder: 'Charm', since: '10:02', intent: 'add refresh rotation',
    files: ['api/auth/session.ts', 'api/auth/refresh.ts', 'migrations/014_refresh.sql'],
    stats: ['+64 −18', '+52 −12', '+26'],
    events: ['10:02 · claimed api/auth', '13:41 · opened PR #167'],
    hunk: ['@@ refresh rotation', '− token reuse allowed once', '+ rotate on every exchange', 'PR #167 · 1 review pending'],
    note: 'Add a test for a reused token.',
    state: 'working', cost: '$3.12', time: '2h 14m', tokens: '410k in · 58k out',
    per: [['session.ts', '182k', '22 edits'], ['refresh.ts', '146k', '19 edits'], ['014_refresh.sql', '38k', '2 edits']],
    feed: ['adding refresh rotation', 'wrote migration · 1 file', 'ran vitest · 8 passed', 'opened PR #167']
  },
  Mote: {
    kind: 'directory · 4 files', waiting: [], sstats: [["1","claim today"],["0","contested"],["1h 02m","average hold"]], sfiles: [["cluster.tf",0,0,"held"],["network.tf",0,0,"held"],["plan.out",12,0,"22m ago"]], guards: [["Replacing a resource needs your yes","infra/**","terraform apply","fired 22m ago"],["Plan before apply","infra/**","apply without plan","never fired"]], history: [["11:08","Mote","paused, guard needs you","warn"],["09:40","Mote","claimed infra/","ok"],["09:30","you","drew the boundary around infra/","muted"]],
    reports: [{"title":"Blast radius of terraform replace","thesis":"Three of the five queued replacements take the cluster with them. The plan output does not say so, because dependents are resolved after the plan is printed.","meta":["5 resources","plan 0142","staging only"],"stats":[["5","to replace"],["3","take the cluster"],["12m","median recovery"]],"chart":{"kind":"chain","nodes":[["cluster","fatal"],["node pool","fatal"],["ingress","fatal"],["dns record","safe"],["tls cert","safe"]]},"chartnote":"Red links mean the dependent goes down with the parent, verified twice on staging.","evidence":[["aws_eks_cluster","14 dependents","full outage, 12m"],["aws_eks_node_group","9 dependents","workloads evicted, 8m"],["aws_lb","4 dependents","ingress 502 for 3m"],["aws_route53_record","0 dependents","no impact"]],"takeaways":["Split the plan: network and DNS can apply on their own.","Cluster and node pool need your yes, every time, with the dependent count in front of you.","Keep the guard on infra/ as it is. It caught this before it ran."],"method":"Plan 0142 applied twice against staging, dependents recorded from the state graph, recovery timed from first failed probe to green."}],
    memories: [["Never apply terraform without a yes",5,8,[1,2],"day 002","today","seen in 8 sessions, enforced by a guard"],["Read the plan twice before applying",4,6,[0],"day 005","today","seen in 6 sessions"],["Cluster and network change separately",3,4,[0],"day 017","1d ago","learned after one bad plan"]], vault: [["AWS_ROLE_ARN","opencoven","1h ago","assume role, no long lived keys"],["TF_STATE_KEY","opencoven","1h ago","read write"]],
    model: 'gpt-5.2 codex', tags: ["infrastructure","researcher","stops at destructive"], churn: '94k', tokin: '88k in', tokout: '6k out', inPct: 93,
    projects: [["opencoven","~/dev/opencoven","11","1h",[["1:1","you","today · 09:40","1h 02m","read the plan, paused on three replacements"],["group","you · Charm","today · 09:30","31m","drew the boundary around infra/"]]]],
    research: [["Blast radius of terraform replace","Three of the five resources take the cluster with them.","4 sources"]],
    harness: 'codex', role: 'Infrastructure', temper: 'Stops at anything destructive',
    mem: ['never applies terraform on its own', 'reads the plan twice', 'asks about infra/'],
    surface: 'infra/', holder: 'Mote', since: '09:40', intent: 'roll the staging cluster',
    files: ['infra/cluster.tf', 'infra/network.tf', 'infra/plan.out'],
    stats: ['held', 'held', 'held'],
    events: ['09:40 · claimed infra/', '11:08 · paused · guard needs you'],
    hunk: ['@@ terraform plan', '− 3 resources to replace', '+ waiting on your approval', 'nothing applied'],
    note: 'Only the network module, not the cluster.',
    state: 'bounded', cost: '$0.94', time: '1h 02m', tokens: '88k in · 6k out',
    per: [['cluster.tf', '44k', '0 edits'], ['network.tf', '31k', '0 edits'], ['plan.out', '13k', '0 edits']],
    feed: ['read terraform plan', '3 resources to replace', 'guard needs your approval', 'paused']
  }
};


// a session's own numbers, for rows working outside their familiar's home surface


const ROWS = {
  "coven-cave|src/shell": {
    "holder": "Hexi",
    "since": "13:20",
    "intent": "match the daemon session list",
    "kind": "directory · 8 files",
    "waiting": [],
    "sstats": [
      [
        "2",
        "claims today"
      ],
      [
        "0",
        "contested"
      ],
      [
        "55m",
        "average hold"
      ]
    ],
    "sfiles": [
      [
        "window-chrome.tsx",
        31,
        6,
        "3m ago"
      ],
      [
        "session-list.tsx",
        20,
        3,
        "9m ago"
      ],
      [
        "shell.test.tsx",
        14,
        0,
        "14m ago"
      ]
    ],
    "guards": [
      [
        "Tests pass before a commit",
        "src/**",
        "commit, push",
        "never fired"
      ]
    ],
    "history": [
      [
        "13:20",
        "Hexi",
        "claimed src/shell",
        "ok"
      ],
      [
        "09:14",
        "Quill",
        "released src/shell",
        "muted"
      ]
    ],
    "files": [
      "src/shell/window-chrome.tsx",
      "src/shell/session-list.tsx",
      "src/shell/shell.test.tsx"
    ],
    "stats": [
      "+31 −6",
      "+20 −3",
      "+14"
    ],
    "dhunks": [
      [
        [
          "ctx",
          "@@ window chrome"
        ],
        [
          "del",
          "  height: 38"
        ],
        [
          "add",
          "  height: 43"
        ],
        [
          "ctx",
          "  traffic lights inline"
        ]
      ]
    ],
    "commits": [
      [
        "4c71a08",
        "match the daemon session list",
        "3m ago",
        "work"
      ],
      [
        "claim",
        "claimed src/shell",
        "55m ago",
        "claim"
      ]
    ],
    "review": [
      [
        "7 tests green",
        "ok"
      ],
      [
        "Your review",
        "wait"
      ]
    ],
    "note": "Keep the titlebar at 43px.",
    "cost": "$0.82",
    "time": "55m",
    "tokens": "74k in · 9k out",
    "per": [
      [
        "window-chrome.tsx",
        "38k",
        "9 edits"
      ],
      [
        "session-list.tsx",
        "24k",
        "5 edits"
      ],
      [
        "shell.test.tsx",
        "12k",
        "2 edits"
      ]
    ],
    "vitals": [
      [
        "state",
        "working",
        "ok"
      ],
      [
        "uptime",
        "55m",
        "muted"
      ],
      [
        "guard",
        "clear",
        "ok"
      ]
    ],
    "calls": [
      [
        "read",
        "opened window-chrome.tsx",
        "0.2s",
        "ok"
      ],
      [
        "edit",
        "set the titlebar height to 43px",
        "0.3s",
        "ok"
      ],
      [
        "bash",
        "ran vitest on src/shell",
        "7.1s",
        "ok"
      ],
      [
        "git",
        "staged 2 files",
        "0.2s",
        "ok"
      ]
    ],
    "buckets": [
      9,
      18,
      26,
      21,
      33,
      28,
      19,
      24,
      31,
      22,
      17,
      25
    ],
    "rate": "$0.90 / hr",
    "mix": [
      [
        "sonnet 4.6",
        100
      ]
    ]
  },
  "coven-cave|src/pty": {
    "holder": "Mote",
    "since": "13:44",
    "intent": "follow the terminal size on attach",
    "kind": "directory · 5 files",
    "waiting": [],
    "sstats": [
      [
        "1",
        "claim today"
      ],
      [
        "0",
        "contested"
      ],
      [
        "26m",
        "average hold"
      ]
    ],
    "sfiles": [
      [
        "pty-host.ts",
        12,
        2,
        "6m ago"
      ],
      [
        "resize.ts",
        6,
        2,
        "18m ago"
      ]
    ],
    "guards": [
      [
        "No spawn without a session id",
        "src/pty/**",
        "process spawn",
        "never fired"
      ]
    ],
    "history": [
      [
        "13:44",
        "Mote",
        "claimed src/pty",
        "ok"
      ],
      [
        "13:40",
        "you",
        "agreed on the socket contract",
        "muted"
      ]
    ],
    "files": [
      "src/pty/pty-host.ts",
      "src/pty/resize.ts"
    ],
    "stats": [
      "+12 −2",
      "+6 −2"
    ],
    "dhunks": [
      [
        [
          "ctx",
          "@@ pty attach"
        ],
        [
          "del",
          "  cols: 80"
        ],
        [
          "add",
          "  cols: term.cols"
        ],
        [
          "ctx",
          "  buffer flushed on resize"
        ]
      ]
    ],
    "commits": [
      [
        "9a02f31",
        "follow the terminal size on attach",
        "6m ago",
        "work"
      ],
      [
        "claim",
        "claimed src/pty",
        "26m ago",
        "claim"
      ]
    ],
    "review": [
      [
        "2 tests green",
        "ok"
      ],
      [
        "Your review",
        "wait"
      ]
    ],
    "note": "Flush the buffer before the resize.",
    "cost": "$0.31",
    "time": "26m",
    "tokens": "29k in · 3k out",
    "per": [
      [
        "pty-host.ts",
        "19k",
        "4 edits"
      ],
      [
        "resize.ts",
        "8k",
        "2 edits"
      ]
    ],
    "vitals": [
      [
        "state",
        "working",
        "ok"
      ],
      [
        "uptime",
        "26m",
        "muted"
      ],
      [
        "guard",
        "clear",
        "ok"
      ]
    ],
    "calls": [
      [
        "read",
        "opened pty-host.ts",
        "0.2s",
        "ok"
      ],
      [
        "edit",
        "took cols from the terminal",
        "0.3s",
        "ok"
      ],
      [
        "bash",
        "attached a test pty",
        "2.4s",
        "ok"
      ]
    ],
    "buckets": [
      6,
      11,
      14,
      9,
      12,
      8,
      7,
      5,
      6,
      4,
      3,
      2
    ],
    "rate": "$0.70 / hr",
    "mix": [
      [
        "gpt-5.2 codex",
        100
      ]
    ]
  },
  "castcodes|api/auth": {
    "holder": "Charm",
    "since": "12:10",
    "intent": "port the login flow to the runtime",
    "kind": "directory · 6 files",
    "waiting": [],
    "sstats": [
      [
        "1",
        "claim today"
      ],
      [
        "0",
        "contested"
      ],
      [
        "1h 48m",
        "average hold"
      ]
    ],
    "sfiles": [
      [
        "login.ts",
        58,
        19,
        "5m ago"
      ],
      [
        "session.ts",
        26,
        8,
        "22m ago"
      ],
      [
        "auth.test.ts",
        12,
        4,
        "40m ago"
      ]
    ],
    "guards": [
      [
        "No secret in a prompt",
        "repo",
        "vault reads",
        "never fired"
      ]
    ],
    "history": [
      [
        "12:10",
        "Charm",
        "claimed api/auth",
        "ok"
      ],
      [
        "12:02",
        "you",
        "asked for the port",
        "muted"
      ]
    ],
    "files": [
      "api/auth/login.ts",
      "api/auth/session.ts",
      "api/auth/auth.test.ts"
    ],
    "stats": [
      "+58 −19",
      "+26 −8",
      "+12 −4"
    ],
    "dhunks": [
      [
        [
          "ctx",
          "@@ login flow"
        ],
        [
          "del",
          "  legacy session cookie"
        ],
        [
          "add",
          "  bearer token from the runtime"
        ],
        [
          "ctx",
          "  PR #12 open"
        ]
      ]
    ],
    "commits": [
      [
        "d1e77b2",
        "port the login flow",
        "5m ago",
        "work"
      ],
      [
        "pr",
        "opened PR #12",
        "18m ago",
        "pr"
      ],
      [
        "claim",
        "claimed api/auth",
        "1h 48m ago",
        "claim"
      ]
    ],
    "review": [
      [
        "4 tests green",
        "ok"
      ],
      [
        "PR #12 open",
        "ok"
      ],
      [
        "Your review",
        "wait"
      ]
    ],
    "note": "Drop the legacy cookie path entirely.",
    "cost": "$1.62",
    "time": "1h 48m",
    "tokens": "198k in · 26k out",
    "per": [
      [
        "login.ts",
        "104k",
        "17 edits"
      ],
      [
        "session.ts",
        "61k",
        "8 edits"
      ],
      [
        "auth.test.ts",
        "33k",
        "3 edits"
      ]
    ],
    "vitals": [
      [
        "state",
        "working",
        "ok"
      ],
      [
        "uptime",
        "1h 48m",
        "muted"
      ],
      [
        "guard",
        "clear",
        "ok"
      ]
    ],
    "calls": [
      [
        "read",
        "opened login.ts",
        "0.3s",
        "ok"
      ],
      [
        "edit",
        "swapped the cookie for a bearer token",
        "0.6s",
        "ok"
      ],
      [
        "bash",
        "ran the auth suite",
        "9.8s",
        "ok"
      ],
      [
        "git",
        "opened PR #12",
        "1.7s",
        "ok"
      ]
    ],
    "buckets": [
      22,
      38,
      44,
      51,
      40,
      33,
      47,
      39,
      28,
      35,
      30,
      26
    ],
    "rate": "$0.90 / hr",
    "mix": [
      [
        "sonnet 4.6",
        100
      ]
    ]
  },
  "grimoire|docs/guides": {
    "holder": "Hexi",
    "since": "14:06",
    "intent": "rewrite the claims guide",
    "kind": "directory · 12 files",
    "waiting": [],
    "sstats": [
      [
        "2",
        "claims today"
      ],
      [
        "0",
        "contested"
      ],
      [
        "34m",
        "average hold"
      ]
    ],
    "sfiles": [
      [
        "claims.md",
        48,
        14,
        "2m ago"
      ],
      [
        "guards.md",
        21,
        6,
        "11m ago"
      ],
      [
        "getting-started.md",
        5,
        2,
        "26m ago"
      ]
    ],
    "guards": [
      [
        "Docs need a build check",
        "docs/**",
        "merge",
        "never fired"
      ]
    ],
    "history": [
      [
        "14:06",
        "Hexi",
        "claimed docs/guides",
        "ok"
      ],
      [
        "13:55",
        "Sage",
        "claimed docs/reference",
        "ok"
      ]
    ],
    "files": [
      "docs/guides/claims.md",
      "docs/guides/guards.md",
      "docs/guides/getting-started.md"
    ],
    "stats": [
      "+48 −14",
      "+21 −6",
      "+5 −2"
    ],
    "dhunks": [
      [
        [
          "ctx",
          "@@ claims guide"
        ],
        [
          "del",
          "  A claim is a lock."
        ],
        [
          "add",
          "  A claim announces intent, and the runtime answers."
        ],
        [
          "ctx",
          "  two examples added"
        ]
      ]
    ],
    "commits": [
      [
        "f30cc19",
        "rewrite the claims guide",
        "2m ago",
        "work"
      ],
      [
        "claim",
        "claimed docs/guides",
        "34m ago",
        "claim"
      ]
    ],
    "review": [
      [
        "Build check green",
        "ok"
      ],
      [
        "Your review",
        "wait"
      ]
    ],
    "note": "Lead with the overlap example.",
    "cost": "$0.74",
    "time": "34m",
    "tokens": "96k in · 18k out",
    "per": [
      [
        "claims.md",
        "52k",
        "11 edits"
      ],
      [
        "guards.md",
        "28k",
        "5 edits"
      ],
      [
        "getting-started.md",
        "16k",
        "2 edits"
      ]
    ],
    "vitals": [
      [
        "state",
        "working",
        "ok"
      ],
      [
        "uptime",
        "34m",
        "muted"
      ],
      [
        "guard",
        "clear",
        "ok"
      ]
    ],
    "calls": [
      [
        "read",
        "opened claims.md",
        "0.2s",
        "ok"
      ],
      [
        "edit",
        "rewrote the opening paragraph",
        "0.4s",
        "ok"
      ],
      [
        "edit",
        "added two overlap examples",
        "0.5s",
        "ok"
      ],
      [
        "git",
        "staged 3 files",
        "0.2s",
        "ok"
      ]
    ],
    "buckets": [
      11,
      19,
      24,
      30,
      22,
      27,
      33,
      25,
      20,
      28,
      23,
      18
    ],
    "rate": "$1.30 / hr",
    "mix": [
      [
        "sonnet 4.6",
        88
      ],
      [
        "haiku",
        12
      ]
    ]
  },
  "grimoire|docs/reference": {
    "holder": "Sage",
    "since": "13:55",
    "intent": "generate the CLI reference",
    "kind": "directory · 9 files",
    "waiting": [],
    "sstats": [
      [
        "1",
        "claim today"
      ],
      [
        "0",
        "contested"
      ],
      [
        "21m",
        "average hold"
      ]
    ],
    "sfiles": [
      [
        "cli.md",
        96,
        7,
        "4m ago"
      ],
      [
        "flags.md",
        22,
        2,
        "13m ago"
      ]
    ],
    "guards": [
      [
        "Docs need a build check",
        "docs/**",
        "merge",
        "never fired"
      ]
    ],
    "history": [
      [
        "13:55",
        "Sage",
        "claimed docs/reference",
        "ok"
      ]
    ],
    "files": [
      "docs/reference/cli.md",
      "docs/reference/flags.md"
    ],
    "stats": [
      "+96 −7",
      "+22 −2"
    ],
    "dhunks": [
      [
        [
          "ctx",
          "@@ cli reference"
        ],
        [
          "add",
          "  coven claim add <surface>"
        ],
        [
          "add",
          "  coven session resume <familiar>"
        ],
        [
          "ctx",
          "  22 flags checked against the source"
        ]
      ]
    ],
    "commits": [
      [
        "b58af04",
        "generate the CLI reference",
        "4m ago",
        "work"
      ],
      [
        "claim",
        "claimed docs/reference",
        "21m ago",
        "claim"
      ]
    ],
    "review": [
      [
        "Build check green",
        "ok"
      ],
      [
        "22 flags verified",
        "ok"
      ],
      [
        "Your review",
        "wait"
      ]
    ],
    "note": "Group the claim commands together.",
    "cost": "$0.46",
    "time": "21m",
    "tokens": "61k in · 14k out",
    "per": [
      [
        "cli.md",
        "44k",
        "8 edits"
      ],
      [
        "flags.md",
        "17k",
        "3 edits"
      ]
    ],
    "vitals": [
      [
        "state",
        "working",
        "ok"
      ],
      [
        "uptime",
        "21m",
        "muted"
      ],
      [
        "guard",
        "clear",
        "ok"
      ]
    ],
    "calls": [
      [
        "read",
        "read cli.ts for the flag list",
        "0.4s",
        "ok"
      ],
      [
        "write",
        "generated the reference table",
        "0.6s",
        "ok"
      ],
      [
        "bash",
        "ran the docs build",
        "5.2s",
        "ok"
      ]
    ],
    "buckets": [
      8,
      14,
      22,
      26,
      18,
      15,
      20,
      17,
      12,
      14,
      10,
      9
    ],
    "rate": "$1.30 / hr",
    "mix": [
      [
        "gpt-5.2 codex",
        100
      ]
    ]
  }
};



function rec(name) {
  const ctx = _ctx || {};
  const extra = ROWS[(ctx.proj || '') + '|' + (ctx.surface || '')];
  return extra ? Object.assign({}, FAM[name], extra) : FAM[name];
}



function winFields(kind, name) {
  const d = rec(name);
  if (!d) return null;
  if (kind === 'profile') return {
    head: name, name: name, harness: d.harness, model: d.model,
    churn: d.churn, tokin: d.tokin, tokout: d.tokout, cost: d.cost, time: d.time + ' of wall time'
  };
  const ctx = _ctx || {};
  if (kind === 'surface') return {
    head: ctx.surface || d.surface, kind: d.kind, holder: d.holder, since: d.since, intent: d.intent, guards: d.guards,
    f1: d.files[0], f2: d.files[1], f3: d.files[2], e1: d.events[0], e2: d.events[1]
  };
  if (kind === 'diff') return { head: name, note: d.note };
  return {
    head: name, hmodel: modelLine(d.harness, d.model),
    intent: ctx.intent || d.intent, surf: ctx.surface || d.surface,
    cost: d.cost, costsub: 'this session', time: d.time, timesub: 'since it claimed', tokens: d.tokens
  };
}

// deterministic per familiar, so the grid looks the same on every open



function commitSeries(name, n) {
  let s = 0;
  for (let i = 0; i < name.length; i++) s = (s * 31 + name.charCodeAt(i)) % 9973;
  const out = [];
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const r = (s / 2147483648);
    const weekday = i % 7;
    const quiet = weekday === 5 || weekday === 6 ? 0.55 : 1;
    const recency = 0.45 + 0.55 * (i / n);
    const v = r * quiet * recency;
    out.push(v > 0.62 ? 4 : v > 0.46 ? 3 : v > 0.3 ? 2 : v > 0.16 ? 1 : 0);
  }
  return out;
}




function fillProfile(name) {
  const win = document.querySelector('[data-win="profile"]');
  const d = FAM[name];
  if (!win || !d) return;

  const logo = win.querySelector('[data-wp-logo]');
  if (logo) logo.src = d.harness === 'codex' ? 'https://opencoven.ai/logos/openai.svg' : 'https://opencoven.ai/logos/anthropic.svg';

  _winFam = name;
  renderTags(win, name);

  const inBar = win.querySelector('[data-wp-bar-in]');
  const outBar = win.querySelector('[data-wp-bar-out]');
  if (inBar) inBar.style.width = d.inPct + '%';
  if (outBar) outBar.style.width = (100 - d.inPct) + '%';

  paintCommits(win, name);
  paintProjects(win, d);
  paintMemory(win, d);
  paintVault(win, d);

  syncResearchTab(win, d);
  const box = win.querySelector('[data-wp-research]');
  if (box) {
    box.textContent = '';
    d.research.forEach((r, ri) => {
      const card = document.createElement('div');
      card.style.cssText = 'border: 1px solid var(--cv-border-hairline); border-radius: 10px; background: var(--cv-bg-elevated); padding: 14px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; transition: border-color 180ms cubic-bezier(0.2,0,0,1)';
      card.onmouseenter = () => { card.style.borderColor = 'color-mix(in oklch, var(--cv-accent) 42%, transparent)'; };
      card.onmouseleave = () => { card.style.borderColor = 'var(--cv-border-hairline)'; };
      card.addEventListener('click', () => { openWin('report', _winFam || name, ri); _stack = ['profile', 'report']; });
      const h = document.createElement('div');
      h.style.cssText = 'font-size: 15px; font-weight: 500';
      h.textContent = r[0];
      const p = document.createElement('div');
      p.style.cssText = 'font-size: 13.5px; line-height: 1.6; color: var(--cv-text-secondary)';
      p.textContent = r[1];
      const s = document.createElement('div');
      s.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cv-text-muted)";
      s.textContent = r[2];
      card.appendChild(h); card.appendChild(p); card.appendChild(s);
      box.appendChild(card);
    });
  }
  showWinTab(win, 'profile');
}




function showWinTab(win, which) {
  Array.from(win.querySelectorAll('[data-wp-tab]')).forEach((b) => {
    const on = b.dataset.wpTab === which;
    b.style.color = on ? 'var(--cv-text-primary)' : 'var(--cv-text-muted)';
    b.style.borderBottomColor = on ? 'var(--cv-accent)' : 'transparent';
  });
  Array.from(win.querySelectorAll('[data-wp-panel]')).forEach((p) => {
    p.style.display = p.dataset.wpPanel === which ? 'block' : 'none';
  });
}




function paintCommits(win, name) {
  const grid = win.querySelector('[data-wp-grid]');
  const wrap = win.querySelector('[data-wp-gridwrap]');
  const track = win.querySelector('[data-wp-track]');
  const months = win.querySelector('[data-wp-months]');
  if (!grid || !wrap || !track) return;
  const weeks = 34;
  const series = commitSeries(name, weeks * 7);
  grid.textContent = '';
  series.forEach((v) => {
    const cell = document.createElement('span');
    const tone = v === 0 ? 'var(--cv-bg-sunken)'
      : 'color-mix(in oklch, var(--cv-accent) ' + (18 + v * 20) + '%, var(--cv-bg-sunken))';
    cell.style.cssText = 'width: 10px; height: 10px; border-radius: 2px; background: ' + tone;
    grid.appendChild(cell);
  });
  if (months) {
    months.textContent = '';
    ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].forEach((m) => {
      const s = document.createElement('span');
      s.style.cssText = 'width: 52px; flex-shrink: 0';
      s.textContent = m;
      months.appendChild(s);
    });
  }
  // newest weeks sit at the right edge, and the fade eats into the older end
  const max = () => Math.max(0, grid.scrollWidth - wrap.clientWidth);
  _gridX = -max();
  track.style.transform = 'translateX(' + _gridX + 'px)';
  if (wrap.dataset.dragWired) return;
  wrap.dataset.dragWired = '1';
  wrap.addEventListener('pointerdown', (e) => {
    const x0 = e.clientX;
    const start = _gridX || 0;
    wrap.style.cursor = 'grabbing';
    track.style.transition = 'none';
    const move = (ev) => {
      _gridX = Math.min(0, Math.max(-max(), start + (ev.clientX - x0)));
      track.style.transform = 'translateX(' + _gridX + 'px)';
    };
    const up = () => {
      wrap.style.cursor = 'grab';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

// memory as a graph: a note gets bigger the more sessions confirm it, and links
// thicken where two notes keep turning up together



const ROLES = ['interface', 'visual polish', 'infrastructure', 'auth', 'researcher', 'tests first', 'token thrifty', 'migrations', 'planner', 'reviewer', 'docs', 'stops at destructive', 'plans first'];




function renderTags(win, name) {
  const host = win.querySelector('[data-wp-tags]');
  const d = FAM[name];
  if (!host || !d) return;
  host.textContent = '';
  d.tags.forEach((t) => {
    const research = t === 'researcher';
    const pill = document.createElement('span');
    pill.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 9.5px; white-space: nowrap; border-radius: 999px; padding: 3px 5px 3px 9px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid " +
      (research ? 'color-mix(in oklch, var(--cv-accent) 40%, transparent)' : 'var(--cv-border-hairline)') +
      '; color: ' + (research ? 'var(--cv-accent)' : 'var(--cv-text-muted)');
    pill.appendChild(document.createTextNode(t));
    const x = document.createElement('button');
    x.type = 'button';
    x.setAttribute('aria-label', 'Remove ' + t);
    x.style.cssText = 'width: 13px; height: 13px; border: none; border-radius: 999px; background: transparent; color: inherit; font-family: inherit; font-size: 9px; line-height: 1; cursor: pointer; opacity: 0.5; display: inline-flex; align-items: center; justify-content: center';
    x.textContent = '✕';
    x.onmouseenter = () => { x.style.opacity = '1'; };
    x.onmouseleave = () => { x.style.opacity = '0.5'; };
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      d.tags = d.tags.filter((k) => k !== t);
      renderTags(win, name);
      syncResearchTab(win, d);
    });
    pill.appendChild(x);
    host.appendChild(pill);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.setAttribute('data-wp-addrole', '');
  add.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 9.5px; white-space: nowrap; border-radius: 999px; padding: 3px 10px; border: 1px dashed var(--cv-border-strong); background: transparent; color: var(--cv-text-secondary); cursor: pointer";
  add.textContent = '+ role';
  add.addEventListener('click', (e) => { e.stopPropagation(); toggleRoleMenu(win, name); });
  host.appendChild(add);
}




function toggleRoleMenu(win, name) {
  const menu = win.querySelector('[data-wp-rolemenu]');
  if (!menu) return;
  const open = menu.style.display !== 'none';
  menu.style.display = open ? 'none' : 'block';
  if (open) return;
  const filter = menu.querySelector('[data-wp-rolefilter]');
  if (filter) { filter.value = ''; filter.oninput = () => paintRoleOptions(win, name); filter.focus(); }
  paintRoleOptions(win, name);
}




function paintRoleOptions(win, name) {
  const menu = win.querySelector('[data-wp-rolemenu]');
  const box = menu && menu.querySelector('[data-wp-roleopts]');
  const filter = menu && menu.querySelector('[data-wp-rolefilter]');
  const d = FAM[name];
  if (!box || !d) return;
  const q = ((filter && filter.value) || '').toLowerCase().trim();
  const pool = ROLES.filter((r) => d.tags.indexOf(r) === -1 && r.indexOf(q) > -1);
  box.textContent = '';
  const addRole = (role) => {
    d.tags = d.tags.concat([role]);
    menu.style.display = 'none';
    renderTags(win, name);
    syncResearchTab(win, d);
  };
  pool.forEach((r) => {
    const opt = document.createElement('button');
    opt.type = 'button';
    opt.style.cssText = 'text-align: left; font-family: inherit; font-size: 12.5px; color: var(--cv-text-secondary); background: transparent; border: none; border-radius: 7px; padding: 7px 9px; cursor: pointer';
    opt.textContent = r;
    opt.onmouseenter = () => { opt.style.background = 'var(--cv-bg-hover)'; opt.style.color = 'var(--cv-text-primary)'; };
    opt.onmouseleave = () => { opt.style.background = 'transparent'; opt.style.color = 'var(--cv-text-secondary)'; };
    opt.addEventListener('click', (e) => { e.stopPropagation(); addRole(r); });
    box.appendChild(opt);
  });
  if (q && ROLES.indexOf(q) === -1 && d.tags.indexOf(q) === -1) {
    const make = document.createElement('button');
    make.type = 'button';
    make.style.cssText = 'text-align: left; font-family: inherit; font-size: 12.5px; color: var(--cv-accent); background: transparent; border: none; border-radius: 7px; padding: 7px 9px; cursor: pointer';
    make.textContent = 'add "' + q + '"';
    make.addEventListener('click', (e) => { e.stopPropagation(); addRole(q); });
    box.appendChild(make);
  }
  if (!box.children.length) {
    const none = document.createElement('div');
    none.style.cssText = 'font-size: 12.5px; color: var(--cv-text-muted); padding: 7px 9px';
    none.textContent = 'no roles left';
    box.appendChild(none);
  }
}




function syncResearchTab(win, d) {
  const tab = win.querySelector('[data-wp-tab="research"]');
  const on = d.tags.indexOf('researcher') > -1 && (d.research || []).length > 0;
  if (tab) tab.style.display = on ? 'block' : 'none';
  if (!on) {
    const panel = win.querySelector('[data-wp-panel="research"]');
    if (panel && panel.style.display !== 'none') showWinTab(win, 'profile');
  }
}




function paintMemory(win, d, keepSel) {
  const host = win.querySelector('[data-wp-graph]');
  if (!host) return;
  const M = d.memories || [];
  const NS = 'http://www.w3.org/2000/svg';
  const W = Math.max(430, Math.round(host.clientWidth || 830)), H = 268;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.textContent = '';

  const mk = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    return n;
  };
  const svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', preserveAspectRatio: 'xMidYMid meet' });
  svg.style.display = 'block';
  svg.style.height = H + 'px';

  // retrieval reads left to right: where a note came from, the note, what it changed
  const defs = mk('defs', {});
  const grad = mk('linearGradient', { id: 'cvEdge', x1: '0', y1: '0', x2: '1', y2: '0' });
  grad.appendChild(mk('stop', { offset: '0', 'stop-color': 'var(--cv-text-muted)', 'stop-opacity': '0.15' }));
  grad.appendChild(mk('stop', { offset: '0.55', 'stop-color': 'var(--cv-accent)', 'stop-opacity': '0.5' }));
  grad.appendChild(mk('stop', { offset: '1', 'stop-color': 'var(--cv-accent)', 'stop-opacity': '0.85' }));
  defs.appendChild(grad);
  const glow = mk('radialGradient', { id: 'cvGlow' });
  glow.appendChild(mk('stop', { offset: '0', 'stop-color': 'var(--cv-accent)', 'stop-opacity': '0.30' }));
  glow.appendChild(mk('stop', { offset: '1', 'stop-color': 'var(--cv-accent)', 'stop-opacity': '0' }));
  defs.appendChild(glow);
  svg.appendChild(defs);

  const total = M.reduce((s, m) => s + m[2], 0) || 1;
  const sources = [
    ['1 on 1 with you', Math.round(total * 0.55)],
    ['group sessions', Math.round(total * 0.3)],
    ['your corrections', Math.max(1, Math.round(total * 0.15))],
  ];
  const SX = Math.round(W * 0.118), MX = Math.round(W * 0.475), BX = Math.round(W * 0.875);
  const sPos = sources.map((s, i) => ({ x: SX, y: 52 + i * ((H - 104) / Math.max(1, sources.length - 1)) }));
  const mPos = M.map((m, i) => ({ x: MX, y: M.length === 1 ? H / 2 : 66 + i * ((H - 108) / Math.max(1, M.length - 1)) }));
  const settled = M.filter((m) => m[1] >= 4);
  const bPos = { x: BX, y: H / 2 };
  const rMem = M.map((m) => 8 + m[1] * 3.2);
  const rHub = 15 + settled.length * 2.6;
  const rSrc = 17;
  // every line starts on the rim, aimed at the other circle's centre
  const rim = (from, to, r) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: from.x + (dx / len) * r, y: from.y + (dy / len) * r };
  };

  const col = (label, x, y) => {
    const t = mk('text', { x: x, y: y, 'text-anchor': 'middle', fill: 'var(--cv-text-muted)', 'font-size': '9', 'font-family': 'JetBrains Mono, monospace', 'letter-spacing': '1.4' });
    t.textContent = label;
    svg.appendChild(t);
  };
  col('SOURCES', SX, 18);
  col('WHAT IT LEARNED', MX, 18);
  col('HOW IT ACTS', BX, 18);

  const curve = (a, b) => {
    const dx = (b.x - a.x) * 0.45;
    return 'M ' + a.x + ' ' + a.y + ' C ' + (a.x + dx) + ' ' + a.y + ', ' + (b.x - dx) + ' ' + b.y + ', ' + b.x + ' ' + b.y;
  };

  const edges = [];
  const edge = (a, b, weight, strong) => {
    const p = mk('path', {
      d: curve(a, b), fill: 'none', stroke: 'url(#cvEdge)',
      'stroke-width': String(0.8 + weight * 0.26), 'stroke-linecap': 'round',
    });
    p.style.transition = 'opacity 220ms cubic-bezier(0.2,0,0,1), stroke-width 220ms cubic-bezier(0.2,0,0,1)';
    svg.appendChild(p);
    const flow = mk('path', {
      d: curve(a, b), fill: 'none', stroke: 'var(--cv-accent)',
      'stroke-width': String(strong ? 1.5 : 1), 'stroke-linecap': 'round',
      'stroke-dasharray': '2 12', opacity: strong ? '0.7' : '0.4',
    });
    if (!reduce) flow.style.animation = 'cvFlow ' + (1.6 + weight * 0.12).toFixed(2) + 's linear infinite';
    svg.appendChild(flow);
    return { base: p, flow: flow };
  };

  M.forEach((m, i) => {
    sPos.forEach((s, si) => {
      if (si === 2 && m[1] < 3) return;
      edges.push({
        mem: i,
        parts: edge(rim(s, mPos[i], rSrc), rim(mPos[i], s, rMem[i]), si === 0 ? m[2] * 0.7 : m[2] * 0.4, false),
      });
    });
    if (m[1] >= 4) {
      edges.push({ mem: i, parts: edge(rim(mPos[i], bPos, rMem[i]), rim(bPos, mPos[i], rHub), m[2], true) });
    }
  });

  sources.forEach((s, i) => {
    const g = mk('g', {});
    g.appendChild(mk('circle', { cx: sPos[i].x, cy: sPos[i].y, r: String(rSrc), fill: 'var(--cv-bg-sunken)', stroke: 'var(--cv-border-hairline)' }));
    const n = mk('text', { x: sPos[i].x, y: sPos[i].y + 4, 'text-anchor': 'middle', fill: 'var(--cv-text-secondary)', 'font-size': '11', 'font-family': 'JetBrains Mono, monospace' });
    n.textContent = String(s[1]);
    const lab = mk('text', { x: sPos[i].x, y: sPos[i].y + 32, 'text-anchor': 'middle', fill: 'var(--cv-text-muted)', 'font-size': '9.5', 'font-family': 'JetBrains Mono, monospace' });
    lab.textContent = s[0];
    g.appendChild(n); g.appendChild(lab);
    svg.appendChild(g);
  });

  const nodes = [];
  M.forEach((m, i) => {
    const g = mk('g', {});
    g.style.cursor = 'pointer';
    g.style.transition = 'opacity 220ms cubic-bezier(0.2,0,0,1)';
    const r = rMem[i];
    g.appendChild(mk('circle', { cx: mPos[i].x, cy: mPos[i].y, r: String(r + 16), fill: 'url(#cvGlow)', opacity: String(0.25 + m[1] * 0.14) }));
    g.appendChild(mk('circle', {
      cx: mPos[i].x, cy: mPos[i].y, r: String(r),
      fill: 'color-mix(in oklch, var(--cv-accent) ' + (16 + m[1] * 11) + '%, var(--cv-bg-elevated))',
      stroke: 'color-mix(in oklch, var(--cv-accent) ' + (32 + m[1] * 11) + '%, transparent)', 'stroke-width': '1',
    }));
    const cnt = mk('text', { x: mPos[i].x, y: mPos[i].y + 3.6, 'text-anchor': 'middle', fill: 'var(--cv-text-primary)', 'font-size': '10', 'font-family': 'JetBrains Mono, monospace' });
    cnt.textContent = String(m[2]);
    g.appendChild(cnt);
    g.addEventListener('click', () => {
      if (_memSel === i) clearMemory(win);
      else selectMemory(win, d, i);
    });
    g.addEventListener('mouseenter', () => hoverMemory(i));
    g.addEventListener('mouseleave', () => hoverMemory(null));
    svg.appendChild(g);
    nodes.push(g);
  });

  const bg = mk('g', {});
  const br = rHub;
  bg.appendChild(mk('circle', { cx: bPos.x, cy: bPos.y, r: String(br + 20), fill: 'url(#cvGlow)', opacity: '0.7' }));
  bg.appendChild(mk('circle', { cx: bPos.x, cy: bPos.y, r: String(br), fill: 'var(--cv-accent)', opacity: '0.92' }));
  const bn = mk('text', { x: bPos.x, y: bPos.y + 4, 'text-anchor': 'middle', fill: 'var(--cv-accent-fg)', 'font-size': '11', 'font-family': 'JetBrains Mono, monospace' });
  bn.textContent = String(settled.length);
  const bl = mk('text', { x: bPos.x, y: bPos.y + br + 20, 'text-anchor': 'middle', fill: 'var(--cv-text-muted)', 'font-size': '9.5', 'font-family': 'JetBrains Mono, monospace' });
  bl.textContent = settled.length === 1 ? 'settled rule' : 'settled rules';
  bg.appendChild(bn); bg.appendChild(bl);
  svg.appendChild(bg);

  host.appendChild(svg);
  _memNodes = nodes;
  _memEdges = edges;

  _memD = d;
  _memWin = win;
  if (!_memResize) {
    _memResize = () => fitMemory();
    window.addEventListener('resize', _memResize);
  }
  if (keepSel === 0 || keepSel) selectMemory(win, d, keepSel);
  else clearMemory(win);
}

// the column changes width when the note opens or closes, so the graph is laid out again once
// that transition has finished -- guarded so the repaint cannot schedule another


function fitMemory() {
  const win = _memWin;
  const d = _memD;
  if (!win || !d || _memFitting) return;
  if (_memFitT) clearTimeout(_memFitT);
  _memFitT = setTimeout(() => {
    if (!win.querySelector('[data-wp-graph]')) return;
    _memFitting = true;
    paintMemory(win, d, _memSel);
    _memFitting = false;
  }, 460);
}




function hoverMemory(idx) {
  const on = idx === null || idx === undefined ? null : idx;
  (_memEdges || []).forEach((e) => {
    const lit = on === null ? null : e.mem === on;
    e.parts.base.style.opacity = lit === null ? '1' : lit ? '1' : '0.16';
    e.parts.flow.style.opacity = lit === null ? '' : lit ? '0.9' : '0.05';
  });
  (_memNodes || []).forEach((g, i) => {
    g.style.opacity = on === null ? (i === _memSel ? '1' : '0.55') : i === on ? '1' : '0.35';
  });
}




function selectMemory(win, d, idx) {
  const M = d.memories || [];
  _memSel = idx;
  (_memNodes || []).forEach((g, i) => {
    g.style.opacity = i === idx ? '1' : '0.55';
  });
  (_memEdges || []).forEach((e) => {
    e.parts.base.style.opacity = e.mem === idx ? '1' : '0.3';
  });
  const m = M[idx];
  if (!m) return;
  // the card takes its width from the row, which is what shortens the graph
  const card = win.querySelector('[data-wp-detail]');
  if (!card) return;
  const set = (sel, text) => { const el = card.querySelector(sel); if (el) el.textContent = text; };
  set('[data-wp-dtitle]', m[0]);
  set('[data-wp-dwhere]', m[6]);
  set('[data-wp-dstate]', m[1] >= 5 ? 'settled' : m[1] >= 3 ? 'holding' : 'new');
  set('[data-wp-dmeta]', m[2] + ' confirmations · first seen ' + m[4] + ' · last ' + m[5]);
  const meter = card.querySelector('[data-wp-dmeter]');
  if (meter) {
    meter.textContent = '';
    for (let i = 0; i < 5; i++) {
      const seg = document.createElement('span');
      seg.style.cssText = 'flex: 1; height: 5px; border-radius: 999px; background: ' + (i < m[1] ? 'var(--cv-accent)' : 'var(--cv-bg-sunken)');
      meter.appendChild(seg);
    }
  }
  card.style.flexBasis = '296px';
  card.style.marginLeft = '12px';
  card.style.opacity = '1';
  const close = card.querySelector('[data-wp-dclose]');
  if (close) close.onclick = (ev) => { ev.stopPropagation(); clearMemory(win); };
  fitMemory();
}

// nothing selected: the card gives its width back and the graph fills the row again


function clearMemory(win) {
  _memSel = null;
  (_memNodes || []).forEach((g) => { g.style.opacity = '0.72'; });
  (_memEdges || []).forEach((e) => { e.parts.base.style.opacity = '0.5'; });
  const card = win.querySelector('[data-wp-detail]');
  if (card) {
    card.style.flexBasis = '0px';
    card.style.marginLeft = '0';
    card.style.opacity = '0';
  }
  fitMemory();
}




function ctxState() {
  return (_ctx || {}).state || '';
}



function paintSurface(win, name) {
  const d = rec(name);
  if (!d) return;
  const ctx = _ctx || {};
  const holding = (ctx.state || d.state) === 'holding';
  const holderEl = win.querySelector('[data-w="holder"]');
  if (holderEl) holderEl.textContent = holding ? (d.holder || name) : name;
  const intentEl = win.querySelector('[data-w="intent"]');
  if (intentEl && ctx.doing) intentEl.textContent = ctx.doing;
  const MONO = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none";
  const el = (tag, css, text) => {
    const n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const LBL = MONO + '; font-size: 9.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--cv-text-muted)';

  const live = win.querySelector('[data-ws-live]');
  const contested = (d.waiting || []).length > 0;
  if (live) {
    live.style.color = contested ? 'var(--cv-warning)' : 'var(--cv-success)';
    live.lastChild.textContent = contested ? 'contested' : 'holding';
    const dt = live.querySelector('span');
    if (dt) dt.style.background = contested ? 'var(--cv-warning)' : 'var(--cv-success)';
  }

  const stats = win.querySelector('[data-ws-stats]');
  if (stats) {
    stats.textContent = '';
    (d.sstats || []).forEach((s, i) => {
      const row = el('div', 'display: flex; align-items: baseline; gap: 10px' + (i ? '; padding-top: 11px; border-top: 1px solid var(--cv-border-hairline)' : ''));
      row.appendChild(el('span', "font-family: 'EB Garamond', serif; font-size: 26px; line-height: 1", s[0]));
      row.appendChild(el('span', LBL, s[1]));
      stats.appendChild(row);
    });
  }

  // the queue: who holds it, who is behind them
  const queue = win.querySelector('[data-ws-queue]');
  if (queue) {
    queue.textContent = '';
    const lane = (who, when, intent, held) => {
      const row = el('div', 'display: grid; grid-template-columns: 26px 110px 150px minmax(0,1fr); gap: 12px; align-items: center; padding: 12px 14px; border: 1px solid ' + (held ? 'color-mix(in oklch, var(--cv-success) 34%, transparent)' : 'color-mix(in oklch, var(--cv-warning) 38%, transparent)') + '; border-radius: 10px; background: ' + (held ? 'var(--cv-bg-elevated)' : 'color-mix(in oklch, var(--cv-warning) 8%, transparent)'));
      const badge = el('span', 'width: 20px; height: 20px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; ' + MONO + '; font-size: 9.5px; background: ' + (held ? 'var(--cv-success)' : 'var(--cv-warning)') + '; color: var(--cv-bg-base)', held ? '1' : '2');
      row.appendChild(badge);
      row.appendChild(el('span', 'font-size: 13.5px; font-weight: 500', who));
      row.appendChild(el('span', MONO + '; font-size: 10.5px; color: var(--cv-text-muted)', when));
      row.appendChild(el('span', 'font-size: 13px; color: var(--cv-text-secondary)', intent));
      return row;
    };
    queue.appendChild(lane(d.holder, 'holding since ' + d.since, d.intent, true));
    (d.waiting || []).forEach((w) => queue.appendChild(lane(w[0], w[1], w[2], false)));
    if (!(d.waiting || []).length) {
      queue.appendChild(el('div', 'font-size: 13px; color: var(--cv-text-muted); padding: 4px 2px', 'No one else has asked for it.'));
    }
  }

  const files = win.querySelector('[data-ws-files]');
  if (files) {
    files.textContent = '';
    const head = el('div', 'display: grid; grid-template-columns: minmax(0,1fr) 128px 96px 92px; gap: 12px; padding: 10px 14px; background: var(--cv-bg-sunken); border-bottom: 1px solid var(--cv-border-hairline); ' + LBL);
    ['File', 'Churn', 'Lines', 'Touched'].forEach((h) => head.appendChild(el('span', '', h)));
    files.appendChild(head);
    const peak = Math.max.apply(null, (d.sfiles || [[0, 1, 1]]).map((f) => f[1] + f[2])) || 1;
    (d.sfiles || []).forEach((f, i) => {
      const row = el('div', 'display: grid; grid-template-columns: minmax(0,1fr) 128px 96px 92px; gap: 12px; padding: 12px 14px; align-items: center' + (i ? '; border-top: 1px solid var(--cv-border-hairline)' : ''));
      row.appendChild(el('span', MONO + '; font-size: 12px', f[0]));
      const bar = el('div', 'display: flex; height: 6px; border-radius: 999px; overflow: hidden; background: var(--cv-bg-sunken)');
      const span = (f[1] + f[2]) / peak;
      bar.appendChild(el('span', 'width: ' + (f[1] / Math.max(1, f[1] + f[2])) * 100 * span + '%; background: var(--cv-success)'));
      bar.appendChild(el('span', 'width: ' + (f[2] / Math.max(1, f[1] + f[2])) * 100 * span + '%; background: var(--cv-danger)'));
      row.appendChild(bar);
      const lines = el('span', MONO + '; font-size: 11.5px');
      if (f[1] + f[2] === 0) { lines.style.color = 'var(--cv-text-muted)'; lines.textContent = 'no writes'; }
      else {
        const a = el('span', 'color: var(--cv-success)', '+' + f[1]);
        const b = el('span', 'color: var(--cv-danger)', ' −' + f[2]);
        lines.appendChild(a); lines.appendChild(b);
      }
      row.appendChild(lines);
      row.appendChild(el('span', MONO + '; font-size: 10.5px; color: var(--cv-text-muted); justify-self: end', f[3]));
      files.appendChild(row);
    });
  }

  const guards = win.querySelector('[data-ws-guards]');
  if (guards) {
    guards.textContent = '';
    (d.guards || []).forEach((g) => {
      const fired = g[3].indexOf('fired') === 0;
      const card = el('div', 'border: 1px solid var(--cv-border-hairline); border-left: 2px solid ' + (fired ? 'var(--cv-warning)' : 'var(--cv-border-strong)') + '; border-radius: 10px; background: var(--cv-bg-elevated); padding: 13px 15px; display: flex; flex-direction: column; gap: 8px');
      const top = el('div', 'display: flex; align-items: center; gap: 10px');
      top.appendChild(el('span', 'font-size: 14px; font-weight: 500', g[0]));
      top.appendChild(el('span', MONO + '; font-size: 10px; color: ' + (fired ? 'var(--cv-warning)' : 'var(--cv-text-muted)') + '; margin-left: auto; white-space: nowrap', g[3]));
      card.appendChild(top);
      const meta = el('div', 'display: flex; gap: 18px; ' + MONO + '; font-size: 10.5px; color: var(--cv-text-muted)');
      meta.appendChild(el('span', '', 'scope ' + g[1]));
      meta.appendChild(el('span', '', 'stops ' + g[2]));
      card.appendChild(meta);
      guards.appendChild(card);
    });
  }

  const hist = win.querySelector('[data-ws-history]');
  if (hist) {
    hist.textContent = '';
    (d.history || []).forEach((h, i) => {
      const tone = h[3] === 'warn' ? 'var(--cv-warning)' : h[3] === 'ok' ? 'var(--cv-success)' : 'var(--cv-border-strong)';
      const row = el('div', 'position: relative; display: grid; grid-template-columns: 62px 96px minmax(0,1fr); gap: 14px; align-items: baseline; padding: 13px 0 13px 22px' + (i ? '; border-top: 1px solid var(--cv-border-hairline)' : ''));
      row.appendChild(el('span', 'position: absolute; left: 3px; top: ' + (i ? '20px' : '17px') + '; width: 7px; height: 7px; border-radius: 999px; background: ' + tone));
      row.appendChild(el('span', MONO + '; font-size: 11px; color: var(--cv-text-muted)', h[0]));
      row.appendChild(el('span', 'font-size: 13px; font-weight: 500', h[1]));
      row.appendChild(el('span', 'font-size: 13px; color: var(--cv-text-secondary)', h[2]));
      hist.appendChild(row);
    });
  }
  showWinTab(win, 'claim');
}




function paintReport(name, idx) {
  const win = document.querySelector('[data-win="report"]');
  const d = FAM[name];
  const r = d && d.reports && d.reports[idx];
  if (!win || !r) return;
  const MONO = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none";
  const set = (sel, text) => { const el = win.querySelector(sel); if (el) el.textContent = text; };
  const el = (tag, css, text) => {
    const n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  set('[data-wr-who]', name);
  set('[data-wr-title]', r.title);
  set('[data-wr-thesis]', r.thesis);
  set('[data-wr-method]', r.method);
  set('[data-wr-chartnote]', r.chartnote);

  const meta = win.querySelector('[data-wr-meta]');
  meta.textContent = '';
  r.meta.forEach((m, i) => {
    if (i) meta.appendChild(el('span', 'color: var(--cv-border-strong)', '/'));
    meta.appendChild(el('span', '', m));
  });

  const stats = win.querySelector('[data-wr-stats]');
  stats.textContent = '';
  r.stats.forEach((s, i) => {
    const cell = el('div', 'padding: 20px 30px' + (i ? '; border-left: 1px solid var(--cv-border-hairline)' : ''));
    cell.appendChild(el('div', "font-family: 'EB Garamond', serif; font-size: 40px; line-height: 1; letter-spacing: -0.02em", s[0]));
    cell.appendChild(el('div', MONO + '; font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--cv-text-muted); margin-top: 7px', s[1]));
    stats.appendChild(cell);
  });

  const chart = win.querySelector('[data-wr-chart]');
  chart.textContent = '';
  const c = r.chart;

  if (c.kind === 'matrix') {
    const wrap = el('div', 'display: flex; flex-direction: column; gap: 10px');
    const max = Math.max.apply(null, c.buckets.map((b) => b[1]));
    c.buckets.forEach((b) => {
      const row = el('div', 'display: grid; grid-template-columns: 168px minmax(0,1fr) 34px; gap: 14px; align-items: center');
      row.appendChild(el('span', MONO + '; font-size: 11px; color: var(--cv-text-secondary)', b[0]));
      const tiles = el('div', 'display: flex; gap: 5px');
      for (let i = 0; i < b[1]; i++) {
        const lead = b[1] === max;
        tiles.appendChild(el('span', 'width: 26px; height: 26px; border-radius: ' + (b[0].indexOf('999') > -1 ? '999px' : b[0].indexOf('8px') > -1 ? '7px' : '2px') + '; background: ' + (lead ? 'var(--cv-accent)' : 'var(--cv-bg-sunken)') + '; border: 1px solid ' + (lead ? 'transparent' : 'var(--cv-border-hairline)')));
      }
      row.appendChild(tiles);
      row.appendChild(el('span', "font-family: 'EB Garamond', serif; font-size: 20px; justify-self: end", String(b[1])));
      wrap.appendChild(row);
    });
    chart.appendChild(wrap);
  }

  if (c.kind === 'drift') {
    const max = Math.max.apply(null, c.series.map((s) => Math.max.apply(null, s[1])));
    const grid = el('div', 'display: grid; grid-template-columns: 96px minmax(0,1fr); gap: 12px 14px; align-items: end');
    c.series.forEach((s, si) => {
      grid.appendChild(el('span', MONO + '; font-size: 11px; color: ' + (si ? 'var(--cv-danger)' : 'var(--cv-success)') + '; padding-bottom: 22px', s[0]));
      const bars = el('div', 'display: grid; grid-template-columns: repeat(' + c.months.length + ', minmax(0,1fr)); gap: 8px; align-items: end');
      s[1].forEach((v, mi) => {
        const col = el('div', 'display: flex; flex-direction: column; align-items: center; gap: 6px');
        const h = 6 + (v / max) * 74;
        col.appendChild(el('div', 'width: 100%; height: ' + h.toFixed(0) + 'px; border-radius: 5px 5px 2px 2px; background: ' + (si ? 'color-mix(in oklch, var(--cv-danger) 62%, transparent)' : 'color-mix(in oklch, var(--cv-success) 62%, transparent)')));
        col.appendChild(el('span', MONO + '; font-size: 9.5px; color: var(--cv-text-muted)', c.months[mi]));
        bars.appendChild(col);
      });
      grid.appendChild(bars);
    });
    chart.appendChild(grid);
  }

  if (c.kind === 'chain') {
    const wrap = el('div', 'display: flex; align-items: stretch; gap: 0');
    c.nodes.forEach((n, i) => {
      const fatal = n[1] === 'fatal';
      if (i) {
        const link = el('div', 'align-self: center; width: 34px; height: 2px; background: ' + (c.nodes[i - 1][1] === 'fatal' && fatal ? 'var(--cv-danger)' : 'var(--cv-border-hairline)'));
        wrap.appendChild(link);
      }
      const box = el('div', 'flex: 1; min-width: 0; border: 1px solid ' + (fatal ? 'color-mix(in oklch, var(--cv-danger) 45%, transparent)' : 'var(--cv-border-hairline)') + '; border-radius: 10px; padding: 13px 12px; background: ' + (fatal ? 'color-mix(in oklch, var(--cv-danger) 9%, transparent)' : 'var(--cv-bg-elevated)') + '; display: flex; flex-direction: column; gap: 7px');
      box.appendChild(el('span', 'font-size: 13px; font-weight: 500', n[0]));
      const tag = el('span', 'display: inline-flex; align-items: center; gap: 6px; ' + MONO + '; font-size: 9.5px; letter-spacing: 0.05em; text-transform: uppercase; color: ' + (fatal ? 'var(--cv-danger)' : 'var(--cv-success)'));
      tag.appendChild(el('span', 'width: 5px; height: 5px; border-radius: 999px; background: currentColor'));
      tag.appendChild(document.createTextNode(fatal ? 'takes the cluster' : 'safe alone'));
      box.appendChild(tag);
      wrap.appendChild(box);
    });
    chart.appendChild(wrap);
  }

  const ev = win.querySelector('[data-wr-evidence]');
  ev.textContent = '';
  r.evidence.forEach((row, i) => {
    const line = el('div', 'display: grid; grid-template-columns: 190px 132px minmax(0,1fr); gap: 14px; padding: 12px 14px; align-items: center; font-size: 13px' + (i ? '; border-top: 1px solid var(--cv-border-hairline)' : ''));
    line.appendChild(el('span', MONO + '; font-size: 12px', row[0]));
    line.appendChild(el('span', MONO + '; font-size: 11.5px; color: var(--cv-text-secondary)', row[1]));
    line.appendChild(el('span', 'color: var(--cv-text-muted)', row[2]));
    ev.appendChild(line);
  });

  const take = win.querySelector('[data-wr-takeaways]');
  take.textContent = '';
  r.takeaways.forEach((t, i) => {
    const row = el('div', 'display: grid; grid-template-columns: 26px minmax(0,1fr); gap: 12px; align-items: baseline; border: 1px solid var(--cv-border-hairline); border-left: 2px solid var(--cv-accent); border-radius: 9px; padding: 13px 14px; background: var(--cv-bg-elevated)');
    row.appendChild(el('span', MONO + '; font-size: 11px; color: var(--cv-accent)', String(i + 1).padStart(2, '0')));
    row.appendChild(el('span', 'font-size: 14px; line-height: 1.55', t));
    take.appendChild(row);
  });
}




function paintVault(win, d) {
  const host = win.querySelector('[data-wp-vault]');
  if (!host) return;
  host.textContent = '';
  (d.vault || []).forEach((v) => {
    const row = document.createElement('div');
    row.style.cssText = 'display: grid; grid-template-columns: 26px minmax(0,1fr) 120px 96px; gap: 14px; align-items: center; padding: 13px 14px; border: 1px solid var(--cv-border-hairline); border-radius: 10px; background: var(--cv-bg-elevated)';
    const lock = document.createElement('i');
    lock.className = 'ph ph-lock-key';
    lock.setAttribute('aria-hidden', 'true');
    lock.style.cssText = 'font-size: 15px; line-height: 1; color: var(--cv-text-muted)';
    const block = document.createElement('div');
    block.style.cssText = 'display: flex; flex-direction: column; gap: 4px; min-width: 0';
    const key = document.createElement('span');
    key.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 12.5px";
    key.textContent = v[0];
    const note = document.createElement('span');
    note.style.cssText = 'font-size: 12px; color: var(--cv-text-muted)';
    note.textContent = v[3];
    block.appendChild(key); block.appendChild(note);
    const scope = document.createElement('span');
    scope.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 11px; color: var(--cv-text-secondary)";
    scope.textContent = v[1];
    const used = document.createElement('span');
    used.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 10.5px; color: var(--cv-text-muted); justify-self: end; white-space: nowrap";
    used.textContent = v[2];
    row.appendChild(lock); row.appendChild(block); row.appendChild(scope); row.appendChild(used);
    host.appendChild(row);
  });
}




function paintProjects(win, d) {
  const host = win.querySelector('[data-wp-projects]');
  if (!host) return;
  const count = win.querySelector('[data-wp-projcount]');
  if (count) count.textContent = d.projects.length + (d.projects.length === 1 ? ' project' : ' projects');
  host.textContent = '';

  const el = (tag, css, text) => {
    const n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const MONO = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none";

  d.projects.forEach((p) => {
    const card = el('div', 'border: 1px solid var(--cv-border-hairline); border-radius: 11px; background: var(--cv-bg-elevated); overflow: hidden; transition: border-color 200ms cubic-bezier(0.2,0,0,1)');

    const head = el('div', 'display: flex; align-items: center; gap: 14px; padding: 14px 15px; cursor: pointer');
    head.onmouseenter = () => { card.style.borderColor = 'var(--cv-border-strong)'; };
    head.onmouseleave = () => { card.style.borderColor = 'var(--cv-border-hairline)'; };

    const caret = el('span', 'width: 14px; height: 14px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; line-height: 1; font-size: 9px; color: var(--cv-text-muted); transform-origin: 50% 50%; transition: transform 220ms cubic-bezier(0.2,0,0,1)', '▶');

    const idBlock = el('div', 'min-width: 0; display: flex; flex-direction: column; gap: 3px');
    idBlock.appendChild(el('span', 'font-size: 15px; font-weight: 550; letter-spacing: -0.005em', p[0]));
    idBlock.appendChild(el('span', MONO + '; font-size: 10.5px; color: var(--cv-text-muted)', p[1]));

    const stats = el('div', 'margin-left: auto; display: flex; align-items: center; gap: 22px');
    const sess = el('div', 'display: flex; flex-direction: column; align-items: flex-end; gap: 2px');
    sess.appendChild(el('span', "font-family: 'EB Garamond', serif; font-size: 20px; line-height: 1", String(p[2])));
    sess.appendChild(el('span', "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cv-text-muted)", 'sessions'));
    const last = el('div', 'display: flex; flex-direction: column; align-items: flex-end; gap: 2px');
    last.appendChild(el('span', "font-family: 'EB Garamond', serif; font-size: 20px; line-height: 1", p[3]));
    last.appendChild(el('span', "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cv-text-muted)", 'since last'));
    stats.appendChild(sess);
    stats.appendChild(last);

    head.appendChild(caret);
    head.appendChild(idBlock);
    head.appendChild(stats);

    const body = el('div', 'display: none; border-top: 1px solid var(--cv-border-hairline); background: var(--cv-bg-raised); padding: 6px 15px 14px');
    body.dataset.projBody = '';
    caret.dataset.projCaret = '';
    card.style.flex = 'none';

    p[4].forEach((s, si) => {
      const group = s[0] === 'group';
      const item = el('div', 'position: relative; display: flex; gap: 14px; padding: 13px 0 13px 22px' + (si ? '; border-top: 1px solid var(--cv-border-hairline)' : ''));

      // the rail: a dot per session, tinted when other familiars were in the room
      const rail = el('span', 'position: absolute; left: 3px; top: ' + (si ? '22px' : '19px') + '; width: 7px; height: 7px; border-radius: 999px; background: ' + (group ? 'var(--cv-accent)' : 'var(--cv-border-strong)'));
      item.appendChild(rail);

      const left = el('div', 'min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 7px');
      const topRow = el('div', 'display: flex; align-items: center; gap: 9px; flex-wrap: wrap');

      // participants read as faces, not a comma list
      const faces = el('div', 'display: flex; align-items: center');
      s[1].split(' · ').forEach((who, wi) => {
        const you = who.trim() === 'you';
        const face = el('span', 'width: 21px; height: 21px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; ' + MONO + '; font-size: 9.5px; text-transform: uppercase; border: 1px solid var(--cv-bg-elevated); margin-left: ' + (wi ? '-6px' : '0') + '; background: ' + (you ? 'var(--cv-accent)' : 'var(--cv-bg-sunken)') + '; color: ' + (you ? 'var(--cv-accent-fg)' : 'var(--cv-text-secondary)'), who.trim().slice(0, 1));
        face.title = who.trim();
        faces.appendChild(face);
      });
      const kind = el('span', MONO + '; font-size: 9.5px; letter-spacing: 0.05em; text-transform: uppercase; border-radius: 999px; padding: 3px 9px; border: 1px solid ' + (group ? 'color-mix(in oklch, var(--cv-accent) 38%, transparent)' : 'var(--cv-border-hairline)') + '; color: ' + (group ? 'var(--cv-accent)' : 'var(--cv-text-muted)'), group ? 'group' : '1 on 1');
      const when = el('span', MONO + '; font-size: 10.5px; color: var(--cv-text-muted); white-space: nowrap; margin-left: auto', s[2] + ' · ' + s[3]);
      topRow.appendChild(faces);
      topRow.appendChild(kind);
      topRow.appendChild(when);

      left.appendChild(topRow);
      left.appendChild(el('span', 'font-size: 13.5px; line-height: 1.5; color: var(--cv-text-secondary)', s[4]));
      item.appendChild(left);
      body.appendChild(item);
    });

    head.addEventListener('click', () => {
      const wasOpen = body.style.display !== 'none';
      // one card open at a time, so the region's content can only ever be heads plus one body
      host.querySelectorAll('[data-proj-body]').forEach((b) => { b.style.display = 'none'; });
      host.querySelectorAll('[data-proj-caret]').forEach((c) => { c.style.transform = 'none'; });
      if (wasOpen) return;
      body.style.display = 'block';
      caret.style.transform = 'rotate(90deg)';
      scrollHostTo(host, Math.min(card.offsetTop, host.scrollHeight - host.clientHeight));
    });

    card.appendChild(head);
    card.appendChild(body);
    host.appendChild(card);
  });
}


// the opened card climbs to the top of the region, pushing the ones above it out of view


function scrollHostTo(host, to) {
  const from = host.scrollTop;
  if (Math.abs(to - from) < 2) return;
  const t0 = Date.now();
  const dur = 320;
  const step = () => {
    const p = Math.min(1, (Date.now() - t0) / dur);
    host.scrollTop = from + (to - from) * (1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}



function openWin(kind, name, idx) {
  const win = document.querySelector('[data-win="' + kind + '"]');
  if (!win) return;
  if (kind === 'report') {
    paintReport(name, idx || 0);
  } else {
    const vals = winFields(kind, name);
    if (!vals) return;
    Object.keys(vals).forEach((k) => {
      const el = win.querySelector('[data-w="' + k + '"]');
      if (el) el.textContent = vals[k];
    });
  }
  if (kind === 'profile') fillProfile(name);
  if (kind === 'surface') paintSurface(win, name);
  if (kind === 'diff') paintDiff(win, name);
  if (kind === 'state') {
    const r = rec(name);
    const ctx = _ctx || {};
    paintState(win, name);
    runFeed(win, r.feed, ctx.since || r.since);
  }
  _stack = kind === 'report' ? ['profile', 'report'] : [kind];
  showView(kind);
}

// one continuous move: the frame morphs its height while the outgoing view fades
// and the incoming one rises, both out of flow so nothing can spill past the frame


function showView(kind) {
  const CUB = 'cubic-bezier(0.2,0,0,1)';
  const board = document.querySelector('[data-view="board"]');
  const frame = board && board.parentElement;
  const views = Array.from(document.querySelectorAll('[data-view]'));
  const incoming = views.filter((v) => v.dataset.view === kind)[0];
  const outgoing = views.filter((v) => v !== incoming && v.style.display !== 'none')[0];
  const rail = board && board.querySelector('[data-board-proj]') ? board.querySelector('[data-board-proj]').parentElement : null;
  const table = document.querySelector('[data-live-board]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!frame || !incoming) return;

  const settle = () => {
    views.forEach((v) => {
      v.style.position = '';
      v.style.left = '';
      v.style.right = '';
      v.style.top = '';
      v.style.visibility = '';
      v.style.display = v === incoming ? 'block' : 'none';
    });
    frame.style.height = '';
    frame.style.transition = '';
    incoming.style.transition = '';
    incoming.style.opacity = '';
    incoming.style.transform = '';
  };

  _view = kind;
  if (kind !== 'state' && _feedT) { clearInterval(_feedT); _feedT = null; }
  if (_routeT) { clearTimeout(_routeT); _routeT = null; }

  const railFold = (folded, animate) => {
    if (!rail || !table) return;
    if (window.innerWidth < 1080) {
      // stacked layout: the chip row collapses upward instead of hinging away
      rail.style.transform = 'none';
      table.style.transform = 'none';
      table.style.transition = 'none';
      rail.style.transition = animate ? 'opacity 260ms ' + CUB + ', max-height 420ms ' + CUB : 'none';
      rail.style.opacity = folded ? '0' : '1';
      rail.style.maxHeight = folded ? '0px' : '80px';
      return;
    }
    rail.style.maxHeight = '';
    const w = rail.getBoundingClientRect().width || 260;
    rail.style.transformOrigin = 'left center';
    rail.style.backfaceVisibility = 'hidden';
    rail.style.transition = animate ? 'transform 460ms ' + CUB + ', opacity 300ms ' + CUB : 'none';
    table.style.transition = animate ? 'transform 460ms ' + CUB : 'none';
    rail.style.transform = folded ? 'rotateY(-54deg)' : 'none';
    rail.style.opacity = folded ? '0' : '1';
    table.style.transform = folded ? 'translateX(-' + w + 'px)' : 'none';
  };

  if (reduce || !outgoing) {
    railFold(kind !== 'board', false);
    settle();
    return;
  }

  const titleH = frame.firstElementChild ? frame.firstElementChild.offsetHeight : 43;
  const h0 = frame.offsetHeight;

  // measure where we are going before anything moves
  incoming.style.position = 'absolute';
  incoming.style.left = '0';
  incoming.style.right = '0';
  incoming.style.top = titleH + 'px';
  incoming.style.visibility = 'hidden';
  incoming.style.display = 'block';
  incoming.style.transition = 'none';
  incoming.style.opacity = '0';
  incoming.style.transform = 'translateY(10px)';
  if (kind === 'board') railFold(true, false);
  const h1 = titleH + incoming.offsetHeight;

  outgoing.style.position = 'absolute';
  outgoing.style.left = '0';
  outgoing.style.right = '0';
  outgoing.style.top = titleH + 'px';

  frame.style.height = h0 + 'px';
  frame.style.transition = 'none';
  void frame.offsetWidth;

  requestAnimationFrame(() => {
    incoming.style.visibility = '';
    frame.style.transition = 'height 460ms ' + CUB;
    frame.style.height = h1 + 'px';

    outgoing.style.transition = 'opacity 300ms ' + CUB + ', transform 460ms ' + CUB;
    outgoing.style.opacity = '0';
    outgoing.style.transform = kind === 'board' ? 'translateY(10px)' : 'translateY(-6px)';

    incoming.style.transition = 'opacity 380ms ' + CUB + ' 60ms, transform 460ms ' + CUB;
    incoming.style.opacity = '1';
    incoming.style.transform = 'none';

    // the rail hinges on the same timeline as the height morph
    railFold(kind !== 'board', true);
  });

  _routeT = setTimeout(settle, 500);
}



function closeWin() {
  const stack = _stack || [];
  if (stack.length > 1) {
    stack.pop();
    showView(stack[stack.length - 1]);
    return;
  }
  _stack = [];
  showView('board');
}

// the session view: bars scale to the real numbers, the footer says what is owed
// the real change, file by file: what the agent wrote and what it took out


const DIFF = {
  Hexi: {
    status: ['12 tests green · 0 snapshots stale', 'var(--cv-success)'],
    files: [
      ['ui/composer/composer-shell.tsx', 38, 12, '@@ -142,7 +142,9 @@ ControlPills', [
        ['c', 142, 142, 'const pills = usePillState(session)'],
        ['-', 143, '', "  radius: tokens.radius.sm,"],
        ['-', 144, '', '  boxShadow: elevation2,'],
        ['+', '', 143, '  radius: tokens.radius.full,'],
        ['+', '', 144, "  border: '1px solid ' + tokens.border.hairline,"],
        ['c', 145, 145, "  padding: '4px 10px',"]
      ]],
      ['ui/composer/control-pill.tsx', 21, 4, '@@ -18,4 +18,6 @@ Pill', [
        ['c', 18, 18, 'export function Pill({ label, active }) {'],
        ['-', 19, '', '  const r = active ? 8 : 6'],
        ['+', '', 19, '  const r = 999'],
        ['+', '', 20, "  const ring = active ? 'accent' : 'hairline'"],
        ['c', 20, 21, '  return <span style={pill(r, ring)}>{label}</span>']
      ]],
      ['ui/composer/composer.test.tsx', 27, 0, '@@ -0,0 +1,27 @@ pill radius', [
        ['+', '', 1, "it('keeps small pills fully rounded', () => {"],
        ['+', '', 2, "  expect(pill({ size: 'sm' }).radius).toBe(999)"],
        ['+', '', 3, '})'],
        ['c', '', 4, ''],
        ['+', '', 5, "it('leaves large pills alone', () => {"],
        ['+', '', 6, "  expect(pill({ size: 'lg' }).radius).toBe(8)"]
      ]]
    ]
  },
  Charm: {
    status: ['PR #167 · 1 review pending', 'var(--cv-accent)'],
    files: [
      ['api/auth/session.ts', 64, 18, '@@ -88,10 +88,12 @@ exchange()', [
        ['c', 88, 88, 'const claims = verify(token)'],
        ['-', 89, '', '  if (seen.has(token)) return reuseOnce(token)'],
        ['+', '', 89, '  if (seen.has(token)) throw new ReusedToken()'],
        ['+', '', 90, '  seen.add(rotate(token))'],
        ['c', 90, 91, '  return issue(claims)']
      ]],
      ['api/auth/refresh.ts', 52, 12, '@@ -24,6 +24,9 @@ rotate()', [
        ['c', 24, 24, 'export async function rotate(token) {'],
        ['+', '', 25, "  const next = mint(token.sub, { ttl: '15m' })"],
        ['-', 25, '', '  return token'],
        ['+', '', 26, '  await revoke(token.id)'],
        ['+', '', 27, '  return next'],
        ['c', 26, 28, '}']
      ]],
      ['migrations/014_refresh.sql', 26, 0, '@@ -0,0 +1,26 @@ refresh tokens', [
        ['+', '', 1, 'create table refresh_tokens ('],
        ['+', '', 2, '  id uuid primary key,'],
        ['+', '', 3, '  rotated_from uuid references refresh_tokens(id),'],
        ['+', '', 4, '  used_at timestamptz'],
        ['+', '', 5, ');']
      ]]
    ]
  },
  Sage: {
    status: ['no files touched', 'var(--cv-warning)'],
    empty: ['Nothing written yet.', 'Sage asked for ui/composer at 14:19 and the runtime held it: Hexi has been on that surface since 14:02. Sage read three files and stopped before its first write.'],
    files: [
      ['ui/composer/composer-shell.tsx', 0, 0, '', []],
      ['ui/composer/tokens.ts', 0, 0, '', []],
      ['ui/composer/pill.css', 0, 0, '', []]
    ]
  },
  Mote: {
    status: ['nothing applied', 'var(--cv-danger)'],
    empty: ['The guard stopped it.', 'Mote read the plan and got as far as terraform apply. Three of the five queued replacements take the staging cluster with them, so the guard paused it and left the tree untouched.'],
    files: [
      ['infra/cluster.tf', 0, 0, '', []],
      ['infra/network.tf', 0, 0, '', []],
      ['infra/plan.out', 0, 0, '', []]
    ]
  }
};



function paintDiff(win, name) {
  const d = rec(name);
  const spec = DIFF[name] || DIFF.Hexi;
  const MONO = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none";
  const logo = win.querySelector('[data-wd-logo]');
  if (logo) logo.src = d.harness === 'codex' ? 'https://opencoven.ai/logos/openai.svg' : 'https://opencoven.ai/logos/anthropic.svg';
  const tree = win.querySelector('[data-wd-tree]');
  const ctx = _ctx || {};
  if (tree) tree.textContent = 'working tree · ' + (ctx.proj || 'opencoven');

  const add = spec.files.reduce((s, f) => s + f[1], 0);
  const del = spec.files.reduce((s, f) => s + f[2], 0);
  const total = win.querySelector('[data-wd-total]');
  if (total) {
    total.textContent = '';
    if (add || del) {
      const p = document.createElement('span');
      p.style.color = 'var(--cv-success)';
      p.textContent = '+' + add;
      const m = document.createElement('span');
      m.style.color = 'var(--cv-danger)';
      m.textContent = '−' + del;
      total.appendChild(p);
      total.appendChild(m);
    } else {
      const held = document.createElement('span');
      held.style.color = 'var(--cv-text-muted)';
      held.textContent = 'nothing written';
      total.appendChild(held);
    }
  }
  const count = win.querySelector('[data-wd-count]');
  if (count) count.textContent = spec.files.length + ' files';

  const host = win.querySelector('[data-wd-files]');
  if (!host) return;
  host.textContent = '';
  spec.files.forEach((f, i) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.setAttribute('data-wd-file', String(i));
    row.style.cssText = 'display: block; width: 100%; text-align: left; border: none; border-radius: 8px; background: transparent; padding: 9px 10px; cursor: pointer; font-family: inherit; transition: background-color 150ms cubic-bezier(0.2,0,0,1)';
    const top = document.createElement('div');
    top.style.cssText = 'display: flex; align-items: baseline; gap: 8px; min-width: 0';
    const parts = f[0].split('/');
    const base = parts.pop();
    const dir = document.createElement('span');
    dir.style.cssText = MONO + '; font-size: 11.5px; color: var(--cv-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap';
    dir.textContent = parts.length ? parts.join('/') + '/' : '';
    const nm = document.createElement('span');
    nm.style.cssText = MONO + '; font-size: 12px; color: var(--cv-text-primary); white-space: nowrap';
    nm.textContent = base;
    top.appendChild(dir);
    top.appendChild(nm);
    const bot = document.createElement('div');
    bot.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 6px';
    const held = !f[1] && !f[2];
    const sq = document.createElement('span');
    sq.style.cssText = 'display: inline-flex; gap: 2px';
    const green = held ? 0 : Math.max(1, Math.round((f[1] / (f[1] + f[2] || 1)) * 5));
    for (let k = 0; k < 5; k++) {
      const b = document.createElement('span');
      b.style.cssText = 'width: 7px; height: 7px; border-radius: 2px; background: ' + (held ? 'var(--cv-bg-sunken)' : k < green ? 'var(--cv-success)' : 'var(--cv-danger)');
      sq.appendChild(b);
    }
    const stat = document.createElement('span');
    stat.style.cssText = MONO + '; font-size: 10.5px; margin-left: auto; color: var(--cv-text-muted)';
    stat.textContent = held ? 'held' : '+' + f[1] + (f[2] ? ' −' + f[2] : '');
    bot.appendChild(sq);
    bot.appendChild(stat);
    row.appendChild(top);
    row.appendChild(bot);
    row.addEventListener('click', () => pickDiffFile(win, name, i));
    row.addEventListener('mouseenter', () => { if (_diffFile !== i) row.style.background = 'var(--cv-bg-hover)'; });
    row.addEventListener('mouseleave', () => { if (_diffFile !== i) row.style.background = 'transparent'; });
    host.appendChild(row);
  });
  pickDiffFile(win, name, 0);
}



function pickDiffFile(win, name, idx) {
  const spec = DIFF[name] || DIFF.Hexi;
  const f = spec.files[idx];
  if (!f) return;
  _diffFile = idx;
  const MONO = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none";
  Array.from(win.querySelectorAll('[data-wd-file]')).forEach((r, i) => {
    const on = i === idx;
    r.style.background = on ? 'var(--cv-bg-raised)' : 'transparent';
    r.style.boxShadow = on ? 'inset 0 0 0 1px color-mix(in oklch, var(--cv-accent) 34%, transparent)' : 'none';
  });

  const hunk = win.querySelector('[data-wd-hunk]');
  const chip = win.querySelector('[data-wd-chip]');
  const held = !f[1] && !f[2];
  if (hunk) hunk.textContent = held ? f[0] : f[3];
  if (chip) {
    chip.textContent = held ? 'unwritten' : f[2] ? 'modified' : 'new file';
    chip.style.color = held ? 'var(--cv-text-muted)' : f[2] ? 'var(--cv-accent)' : 'var(--cv-success)';
    chip.style.borderColor = held ? 'var(--cv-border-hairline)' : 'color-mix(in oklch, ' + (f[2] ? 'var(--cv-accent)' : 'var(--cv-success)') + ' 34%, transparent)';
  }

  const body = win.querySelector('[data-wd-lines]');
  if (!body) return;
  body.textContent = '';
  if (held && spec.empty) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding: 26px 22px; display: flex; flex-direction: column; gap: 9px; max-width: 62ch';
    const t = document.createElement('div');
    t.style.cssText = "font-family: 'EB Garamond', serif; font-size: 23px; line-height: 1.2";
    t.textContent = spec.empty[0];
    const p = document.createElement('div');
    p.style.cssText = 'font-size: 13.5px; line-height: 1.6; color: var(--cv-text-secondary)';
    p.textContent = spec.empty[1];
    wrap.appendChild(t);
    wrap.appendChild(p);
    body.appendChild(wrap);
  } else {
    f[4].forEach((ln, i) => {
      const row = document.createElement('div');
      const tone = ln[0] === '+' ? 'var(--cv-success)' : ln[0] === '-' ? 'var(--cv-danger)' : '';
      row.style.cssText = 'display: grid; grid-template-columns: 42px 42px 16px minmax(0,1fr); align-items: baseline; gap: 0; padding: 3px 12px 3px 0; ' + MONO + '; font-size: 12px; line-height: 1.7; opacity: 0; transform: translateY(3px); transition: opacity 260ms cubic-bezier(0.2,0,0,1) ' + (i * 26) + 'ms, transform 300ms cubic-bezier(0.2,0,0,1) ' + (i * 26) + 'ms; background: ' + (tone ? 'color-mix(in oklch, ' + tone + ' 11%, transparent)' : 'transparent');
      const no = (v) => {
        const s = document.createElement('span');
        s.style.cssText = 'text-align: right; padding-right: 12px; color: var(--cv-text-muted); opacity: 0.7; user-select: none';
        s.textContent = v === '' ? '' : String(v);
        return s;
      };
      const sign = document.createElement('span');
      sign.style.cssText = 'color: ' + (tone || 'var(--cv-code-dim)') + '; user-select: none';
      sign.textContent = ln[0] === 'c' ? '' : ln[0];
      const code = document.createElement('span');
      code.style.cssText = 'min-width: 0; white-space: pre; overflow: hidden; text-overflow: ellipsis; color: ' + (ln[0] === 'c' ? 'var(--cv-code-dim)' : 'var(--cv-code-fg)');
      code.textContent = ln[3];
      row.appendChild(no(ln[1]));
      row.appendChild(no(ln[2]));
      row.appendChild(sign);
      row.appendChild(code);
      body.appendChild(row);
      requestAnimationFrame(() => { row.style.opacity = '1'; row.style.transform = 'none'; });
    });
  }

  const status = win.querySelector('[data-wd-status]');
  if (status) {
    status.textContent = '';
    const dot = document.createElement('span');
    dot.style.cssText = 'width: 6px; height: 6px; border-radius: 999px; flex: none; background: ' + spec.status[1];
    const t = document.createElement('span');
    t.textContent = spec.status[0];
    t.style.color = spec.status[1];
    status.appendChild(dot);
    status.appendChild(t);
  }
}



function paintState(win, name) {
  const d = rec(name);
  if (!d) return;
  const ctx = _ctx || {};
  const MONO = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none";
  const state = _resolved && d.state === 'holding' ? 'working' : d.state;
  const tone = state === 'working' ? 'var(--cv-success)' : state === 'holding' ? 'var(--cv-warning)' : 'var(--cv-danger)';

  const face = win.querySelector('[data-ws-face]');
  if (face) face.src = d.harness === 'codex' ? 'https://opencoven.ai/logos/openai.svg' : 'https://opencoven.ai/logos/anthropic.svg';
  const pill = win.querySelector('[data-wst-pill]');
  const dot = win.querySelector('[data-wst-dot]');
  const txt = win.querySelector('[data-wst-txt]');
  if (pill) { pill.style.color = tone; pill.style.borderColor = 'color-mix(in oklch, ' + tone + ' 38%, transparent)'; }
  if (dot) { dot.style.background = tone; dot.style.animation = state === 'working' ? 'cvLive 2.2s ease-out infinite' : state === 'holding' ? 'cvPulse 2s ease-in-out infinite' : 'none'; }
  if (txt) txt.textContent = state;

  const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, '')) * (/k/i.test(s) ? 1000 : 1);
  const inBar = win.querySelector('[data-wst-in]');
  const outBar = win.querySelector('[data-wst-out]');
  const split = win.querySelector('[data-wst-split]');
  if (inBar) inBar.style.width = (d.inPct || 90) + '%';
  if (outBar) outBar.style.width = (100 - (d.inPct || 90)) + '%';
  if (split) split.textContent = (d.tokin || '').replace(' in', '') + ' / ' + (d.tokout || '').replace(' out', '');

  const host = win.querySelector('[data-wst-files]');
  const total = win.querySelector('[data-wst-ftotal]');
  if (host) {
    host.textContent = '';
    const per = d.per || [];
    const max = Math.max.apply(null, per.map((p) => num(p[1])).concat([1]));
    let sum = 0;
    per.forEach((p, i) => {
      sum += num(p[1]);
      const edits = parseInt(p[2], 10) || 0;
      const row = document.createElement('div');
      row.style.cssText = 'display: grid; grid-template-columns: minmax(0,1fr) 62px 74px; align-items: center; gap: 14px; padding: 9px 0; border-top: ' + (i ? '1px solid var(--cv-border-hairline)' : 'none');
      const left = document.createElement('div');
      left.style.cssText = 'min-width: 0; display: flex; flex-direction: column; gap: 6px';
      const nm = document.createElement('span');
      nm.style.cssText = MONO + '; font-size: 12.5px; color: var(--cv-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap';
      nm.textContent = p[0];
      const track = document.createElement('div');
      track.style.cssText = 'height: 3px; border-radius: 999px; background: var(--cv-bg-sunken); overflow: hidden';
      const fill = document.createElement('div');
      fill.style.cssText = 'height: 100%; width: 0%; border-radius: 999px; background: ' + (edits ? 'var(--cv-accent)' : 'color-mix(in oklch, var(--cv-text-muted) 42%, transparent)') + '; transition: width 620ms cubic-bezier(0.2,0,0,1) ' + (i * 70) + 'ms';
      track.appendChild(fill);
      left.appendChild(nm);
      left.appendChild(track);
      const tk = document.createElement('span');
      tk.style.cssText = MONO + '; font-size: 11.5px; color: var(--cv-text-secondary); justify-self: end';
      tk.textContent = p[1];
      const ed = document.createElement('span');
      ed.style.cssText = MONO + '; font-size: 11.5px; justify-self: end; color: ' + (edits ? 'var(--cv-text-secondary)' : 'var(--cv-text-muted)');
      ed.textContent = edits ? p[2] : 'read only';
      row.appendChild(left);
      row.appendChild(tk);
      row.appendChild(ed);
      host.appendChild(row);
      requestAnimationFrame(() => { fill.style.width = Math.max(4, (num(p[1]) / max) * 100).toFixed(0) + '%'; });
    });
    if (total) total.textContent = per.length + ' files · ' + (sum >= 1000 ? Math.round(sum / 1000) + 'k' : sum) + ' tokens';
  }

  const fdot = win.querySelector('[data-wst-footdot]');
  const ftxt = win.querySelector('[data-wst-foottxt]');
  const foot = win.querySelector('[data-wst-foot]');
  const holder = ctx.holder || d.holder;
  const since = ctx.since || d.since;
  let copy = 'Nothing here is contested. ' + name + ' has the surface to itself.';
  if (_resolved && d.state === 'holding') copy = _resolved === 'split'
    ? 'You split the surface. ' + name + ' took the tests and started writing; Hexi kept the shell.'
    : _resolved === 'note'
    ? 'You told them how to divide it. ' + name + ' took your note and resumed.'
    : 'You handed the surface to Hexi. ' + name + ' released the claim and moved on.';
  if (state === 'holding') copy = name + ' is holding. ' + holder + ' claimed this surface at ' + since + ', so nothing of ' + name + "'s writes until you decide.";
  if (state === 'bounded') copy = 'A guard stopped ' + name + ' short of a destructive step. It waits for your yes.';
  if (ftxt) ftxt.textContent = copy;
  if (fdot) { fdot.style.background = tone; fdot.style.animation = state === 'working' ? 'none' : 'cvPulse 2s ease-in-out infinite'; }
  const dive = win.querySelector('[data-wst-dive]');
  if (dive) dive.style.display = state === 'holding' ? 'inline-flex' : 'none';
  if (foot) foot.style.borderColor = state === 'working' ? 'var(--cv-border-hairline)' : 'color-mix(in oklch, ' + tone + ' 34%, transparent)';
}

// every line is a real tool call: a clock, what kind of call it was, then the call


function feedTag(line) {
  const l = line.toLowerCase();
  if (/vitest|test|passed|checked/.test(l)) return ['test', 'var(--cv-success)'];
  if (/claim|overlap|holding|wait|guard|paused/.test(l)) return ['claim', 'var(--cv-warning)'];
  if (/staged|pr #|migration|commit/.test(l)) return ['git', 'var(--cv-text-muted)'];
  if (/edit|restyle|wrote|writing|adding|added|generat|rewrit|plan/.test(l)) return ['write', 'var(--cv-accent)'];
  if (/read|open/.test(l)) return ['read', 'var(--cv-text-secondary)'];
  return ['call', 'var(--cv-text-muted)'];
}



function runFeed(win, lines, since) {
  if (_feedT) clearInterval(_feedT);
  const MONO = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none";
  const cells = Array.from(win.querySelectorAll('[data-w-feed] > div'));
  const base = (() => {
    const m = /(\d+):(\d+)/.exec(since || '14:02');
    return m ? parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 : 50520;
  })();
  const fmt = (s) => {
    const h = Math.floor(s / 3600) % 24;
    const mi = Math.floor(s / 60) % 60;
    const se = Math.floor(s) % 60;
    return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') + ':' + String(se).padStart(2, '0');
  };
  let n = 0;
  let clock = base + 40;
  cells.forEach((c) => {
    if (c.children.length) return;
    const st = document.createElement('span');
    st.setAttribute('data-f', 'stamp');
    st.style.cssText = MONO + '; font-size: 10.5px; color: var(--cv-text-muted); flex: none';
    const tg = document.createElement('span');
    tg.setAttribute('data-f', 'tag');
    tg.style.cssText = MONO + '; font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; width: 40px; flex: none';
    const tx = document.createElement('span');
    tx.setAttribute('data-f', 'text');
    tx.style.cssText = 'font-size: 13px; min-width: 0';
    c.appendChild(st);
    c.appendChild(tg);
    c.appendChild(tx);
  });
  const paint = () => {
    cells.forEach((c, i) => {
      const line = lines[(n + i) % lines.length];
      const last = i === cells.length - 1;
      const tag = feedTag(line);
      c.style.opacity = i === 0 ? '0.45' : '1';
      c.style.transition = 'opacity 300ms cubic-bezier(0.2,0,0,1)';
      c.querySelector('[data-f="stamp"]').textContent = fmt(clock + i * 37);
      const tg = c.querySelector('[data-f="tag"]');
      tg.textContent = tag[0];
      tg.style.color = tag[1];
      const tx = c.querySelector('[data-f="text"]');
      tx.textContent = line;
      tx.style.color = last ? 'var(--cv-text-primary)' : 'var(--cv-text-secondary)';
      tx.style.fontWeight = last ? '500' : '400';
    });
    n = (n + 1) % lines.length;
    clock += 37;
  };
  paint();
  _feedT = setInterval(paint, 2400);
}



function sendNote(win) {
  const input = win.querySelector('[data-w-input]');
  const thread = win.querySelector('[data-w-thread]');
  if (!input || !thread) return;
  const text = (input.value || '').trim();
  if (!text) { input.focus(); return; }
  const name = (win.querySelector('[data-w="head"]').textContent || '').split(' · ')[0];
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; gap: 10px; font-size: 13px; color: var(--cv-text-secondary); background: var(--cv-bg-raised); border: 1px solid color-mix(in oklch, var(--cv-accent) 32%, transparent); border-radius: 9px; padding: 10px 12px';
  const who = document.createElement('span');
  who.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 11px; color: var(--cv-text-muted); flex-shrink: 0";
  who.textContent = 'you';
  const body = document.createElement('span');
  body.style.cssText = 'flex: 1; min-width: 0';
  body.textContent = text;
  const flag = document.createElement('span');
  flag.style.cssText = "font-family: 'JetBrains Mono', monospace; font-variant-ligatures: none; font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cv-accent); flex-shrink: 0";
  flag.textContent = 'queued for ' + name;
  row.appendChild(who);
  row.appendChild(body);
  row.appendChild(flag);
  thread.appendChild(row);
  input.value = '';
  input.focus();
}


// each column earns its own hover: the shape of the data decides the gesture


function wireCellHover(cell, ci) {
  const ACC = 'var(--cv-accent)';
  const underline = (el) => {
    el.style.backgroundImage = 'linear-gradient(currentColor, currentColor)';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'left 100%';
    el.style.backgroundSize = '0% 1px';
    el.style.transition = 'background-size 260ms cubic-bezier(0.2,0,0,1)';
    return {
      on: () => { el.style.backgroundSize = '100% 1px'; },
      off: () => { el.style.backgroundSize = '0% 1px'; },
    };
  };
  let on = () => {};
  let off = () => {};

  if (ci === 0) {
    // identity: the mark lifts and the name signs itself
    const tile = cell.querySelector('span');
    const name = cell.querySelector('div div');
    if (tile) tile.style.transition = 'box-shadow 180ms cubic-bezier(0.2,0,0,1), transform 220ms cubic-bezier(0.2,0,0,1)';
    const u = name ? underline(name) : null;
    on = () => {
      if (tile) {
        tile.style.transform = 'translateY(-1px) scale(1.06)';
        tile.style.boxShadow = '0 0 0 2px color-mix(in oklch, ' + ACC + ' 34%, transparent)';
      }
      if (u) u.on();
    };
    off = () => {
      if (tile) { tile.style.transform = 'none'; tile.style.boxShadow = 'none'; }
      if (u) u.off();
    };
  } else if (ci === 1) {
    // a claim pill: it fills, and a claim dot slides in front of it
    const pill = cell;
    pill.style.transition = 'background-color 170ms cubic-bezier(0.2,0,0,1), border-color 170ms cubic-bezier(0.2,0,0,1), padding-left 200ms cubic-bezier(0.2,0,0,1)';
    const dot = document.createElement('span');
    dot.style.cssText = 'position: absolute; left: 9px; top: 50%; width: 5px; height: 5px; margin-top: -2.5px; border-radius: 999px; background: ' + ACC + '; opacity: 0; transform: scale(0.4); transition: opacity 170ms, transform 200ms cubic-bezier(0.2,0,0,1)';
    pill.style.position = 'relative';
    pill.appendChild(dot);
    const base = pill.style.background;
    const baseBorder = pill.style.borderColor;
    // clearing the longhand would drop the shorthand's padding too, so keep the real value
    const basePad = getComputedStyle(pill).paddingLeft;
    on = () => {
      pill.style.background = 'color-mix(in oklch, ' + ACC + ' 14%, transparent)';
      pill.style.borderColor = 'color-mix(in oklch, ' + ACC + ' 48%, transparent)';
      pill.style.paddingLeft = '20px';
      dot.style.opacity = '1';
      dot.style.transform = 'none';
    };
    off = () => {
      pill.style.background = base;
      pill.style.borderColor = baseBorder || 'var(--cv-border-hairline)';
      pill.style.paddingLeft = basePad;
      dot.style.opacity = '0';
      dot.style.transform = 'scale(0.4)';
    };
  } else if (ci === 2) {
    // the session cell: the state light halos and a caret runs at the end of the live line
    const light = cell.querySelector('span span');
    const log = cell.querySelector('[data-log]');
    const caret = document.createElement('span');
    caret.style.cssText = 'display: inline-block; width: 6px; height: 11px; margin-left: 5px; vertical-align: -1px; background: ' + ACC + '; opacity: 0; transition: opacity 140ms';
    if (log) log.appendChild(caret);
    if (light) light.style.transition = 'box-shadow 200ms cubic-bezier(0.2,0,0,1)';
    if (log) log.style.transition = 'color 170ms cubic-bezier(0.2,0,0,1)';
    const baseColor = log ? log.style.color : '';
    on = () => {
      if (light) light.style.boxShadow = '0 0 0 4px color-mix(in oklch, currentColor 22%, transparent)';
      if (log) log.style.color = 'var(--cv-text-primary)';
      caret.style.opacity = '1';
      caret.style.animation = 'cvCaret 1s steps(1) infinite';
    };
    off = () => {
      if (light) light.style.boxShadow = 'none';
      if (log) log.style.color = baseColor;
      caret.style.opacity = '0';
      caret.style.animation = 'none';
    };
  } else if (ci === 3) {
    // counted lines: the ratio draws itself under the numbers
    cell.style.position = 'relative';
    const nums = (cell.textContent.match(/\d+/g) || []).map(Number);
    const adds = nums[0] || 0;
    const dels = nums[1] || 0;
    const total = adds + dels;
    const bar = document.createElement('span');
    bar.style.cssText = 'position: absolute; left: 0; right: 0; bottom: -7px; height: 3px; border-radius: 999px; overflow: hidden; display: flex; opacity: 0; transform: scaleX(0.3); transform-origin: left center; transition: opacity 170ms, transform 260ms cubic-bezier(0.2,0,0,1)';
    const a = document.createElement('span');
    a.style.cssText = 'height: 100%; background: var(--cv-success); width: ' + (total ? (adds / total) * 100 : 50) + '%';
    const d = document.createElement('span');
    d.style.cssText = 'height: 100%; background: var(--cv-danger); flex: 1';
    bar.appendChild(a);
    bar.appendChild(d);
    if (total) cell.appendChild(bar);
    on = () => { bar.style.opacity = '1'; bar.style.transform = 'none'; };
    off = () => { bar.style.opacity = '0'; bar.style.transform = 'scaleX(0.3)'; };
  } else {
    // a state light: the dot gains a halo and the word signs itself
    const light = cell.querySelector('span');
    const word = cell;
    if (light) light.style.transition = 'box-shadow 200ms cubic-bezier(0.2,0,0,1)';
    const u = underline(word);
    on = () => {
      if (light) light.style.boxShadow = '0 0 0 4px color-mix(in oklch, currentColor 22%, transparent)';
      u.on();
    };
    off = () => {
      if (light) light.style.boxShadow = 'none';
      u.off();
    };
  }

  cell.addEventListener('mouseenter', on);
  cell.addEventListener('mouseleave', off);
}



function initWindows() {
  const COLS = ['profile', 'surface', 'state', 'diff'];
  const rows = Array.from(document.querySelectorAll('[data-panel="sessions"] [data-row]'));
  rows.forEach((row) => {
    // the row itself says who it belongs to, so added projects need no index bookkeeping
    const label = row.firstElementChild && row.firstElementChild.querySelector('div div');
    const name = label ? label.textContent.trim().split('\n')[0].trim() : 'Hexi';
    row.dataset.fam = name;
    Array.from(row.children).forEach((cell, ci) => {
      if (!COLS[ci]) return;
      cell.style.cursor = 'pointer';
      cell.title = 'Open the ' + COLS[ci] + ' view';
      wireCellHover(cell, ci);
    });
  });

  const winClick = (e) => {
    const row = e.target.closest ? e.target.closest('[data-panel="sessions"] [data-row]') : null;
    if (row) {
      const cells = Array.from(row.children);
      const cell = cells.filter((c) => c.contains(e.target))[0];
      const idx = cells.indexOf(cell);
      const txt = (n) => (cells[n] ? cells[n].textContent.trim().replace(/\s+/g, ' ') : '');
      if (COLS[idx]) {
        _ctx = { proj: row.dataset.proj, surface: txt(1), doing: txt(2), diff: txt(3) };
        openWin(COLS[idx], row.dataset.fam);
        return;
      }
    }
    const wtab = e.target.closest ? e.target.closest('[data-wp-tab]') : null;
    if (wtab) { showWinTab(wtab.closest('[data-win]'), wtab.dataset.wpTab); return; }
    const send = e.target.closest ? e.target.closest('[data-w-send]') : null;
    if (send) { sendNote(send.closest('[data-win]')); return; }
    const close = e.target.closest ? e.target.closest('[data-win-close]') : null;
    if (close) closeWin();
  };
  const winKey = (e) => {
    if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-w-input]')) {
      sendNote(e.target.closest('[data-win]'));
      return;
    }

    if (e.key !== 'Escape') return;
    if (_view && _view !== 'board') closeWin();
  };
  document.addEventListener('click', winClick);
  document.addEventListener('keydown', winKey);

}




export function initBoard() {
  register('resolveOverlap', resolveOverlap);
  register('openConflict', openConflict);
  register('pickConflictTab', pickConflictTab);
  register('resolveWithNote', resolveWithNote);
  register('resolveFromDive', resolveFromDive);
  register('undoResolve', undoResolve);
  register('pickProject', pickProject);

  const root = document.querySelector('[data-live-board]');
  if (!root) return;

  pickProjectId('opencoven');
  initRailSwipe();
  initWindows();
  let boardRan = false;
  const boardWatch = () => {
    const el = document.querySelector('[data-live-board]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > -40 && !boardRan) {
      boardRan = true;
      runBoard(false);
      runTicks();
    }
  };
  _ticksRan = false;
  boardWatch();
  window.addEventListener('scroll', boardWatch, { passive: true });
  const onResize = () => {
    const w = window.innerWidth < 1080;
    if (w === wasNarrow) return;
    wasNarrow = w;
    if (_view) showView(_view);
  };
  let wasNarrow = window.innerWidth < 1080;
  window.addEventListener('resize', onResize);
}
