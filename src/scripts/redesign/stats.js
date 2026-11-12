// Live proof numbers (stars, downloads, Discord members) from the CDN-cached
// /api/site-stats endpoint — one same-origin call, no per-visitor GitHub
// traffic. The three links are in the markup from the start and their row
// height is reserved, so a figure arriving (or never arriving) cannot move
// the hero. A missing or zero figure is unknown, not zero: the link simply
// keeps its label.

function fmtProof(n) {
  return n >= 10000 ? Math.round(n / 1000) + 'k' : Math.round(n).toLocaleString();
}

// opacity 0 to 1 over 150ms, ease-out; reduced motion shows the figure at once
function fadeIn(el, text) {
  el.textContent = text;
  el.style.marginRight = '0.6ch';
  el.style.fontVariantNumeric = 'tabular-nums';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.style.opacity = '0';
  el.style.transition = 'opacity 150ms ease-out';
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
}

function showProof(key, n, label) {
  if (!n) return;
  const item = document.querySelector('[data-proof="' + key + '"]');
  const num = item && item.querySelector('[data-proof-count]');
  if (num) fadeIn(num, fmtProof(n));
  if (label) {
    const el = item && item.querySelector('[data-discord-label]');
    if (el) el.textContent = label;
  }
}

function fillStarSplit(rows) {
  const box = document.querySelector('[data-stars-rows]');
  const pop = document.querySelector('[data-stars-pop]');
  if (!box || !pop) return;
  // the popover is display:none in the markup, so a failed request never leaves an
  // empty "Across the org" card behind the stars link
  if (!rows.length) { pop.style.display = 'none'; return; }
  pop.style.display = 'flex';
  const top = rows.slice(0, 6);
  const rest = rows.slice(6);
  const line = (name, stars) =>
    '<span style="display: flex; align-items: baseline; gap: 12px; padding: 3px 0; font-size: 11.5px">' +
      '<span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">' + name + '</span>' +
      '<span style="color: var(--cv-text-primary); font-variant-numeric: tabular-nums">' + stars.toLocaleString() + '</span>' +
    '</span>';
  let html = top.map((r) => line(r.name, r.stars)).join('');
  if (rest.length) {
    html += '<span style="height: 1px; background: var(--cv-border-hairline); margin: 5px 0"></span>' +
      line(rest.length + ' more repos', rest.reduce((sum, r) => sum + r.stars, 0));
  }
  box.innerHTML = html;
}

export function loadProof() {
  fetch('/api/site-stats')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d) return;
      if (d.stars) {
        showProof('stars', d.stars);
        fillStarSplit(d.starSplit || []);
      }
      if (d.downloads) showProof('downloads', d.downloads);
      if (d.discord && d.discord.count) showProof('discord', d.discord.count, d.discord.label);
    })
    .catch(() => {});
}
