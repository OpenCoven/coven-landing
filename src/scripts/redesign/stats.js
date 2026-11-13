// Live proof numbers (stars, downloads, Discord members) from the CDN-cached
// /api/site-stats endpoint — one same-origin call, no per-visitor GitHub
// traffic. Each item stays hidden until its figure arrives.

function fmtProof(n, target) {
  // the whole ramp is formatted the way the TARGET is, so a 12,000 figure
  // counts 0k..12k and never renders wider than the box was sized for
  const t = target === undefined ? n : target;
  return t >= 10000 ? Math.round(n / 1000) + 'k' : Math.round(n).toLocaleString();
}

function rollTo(el, n) {
  const final = fmtProof(n);
  el.style.display = 'inline-block';
  el.style.width = final.length + 'ch';
  el.style.textAlign = 'right';
  el.style.fontVariantNumeric = 'tabular-nums';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = final; return; }
  const t0 = Date.now();
  const dur = 900;
  const tick = () => {
    const p = Math.min(1, (Date.now() - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtProof(n * e, n);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = final;
  };
  requestAnimationFrame(tick);
}

function showProof(key, n, label) {
  if (!n) return;
  const item = document.querySelector('[data-proof="' + key + '"]');
  const sep = document.querySelector('[data-proof-sep="' + key + '"]');
  if (item) item.style.display = item.dataset.proofDisplay || 'inline';
  if (sep) sep.style.display = 'inline';
  const num = item && item.querySelector('[data-stars-count], [data-discord-count], [data-dlcount]');
  if (num) rollTo(num, n);
  if (label) {
    const el = item && item.querySelector('[data-discord-label]');
    if (el) el.textContent = label;
  }
}

function fillStarSplit(rows) {
  const box = document.querySelector('[data-stars-rows]');
  const pop = document.querySelector('[data-stars-pop]');
  if (!box || !pop) return;
  if (!rows.length) { pop.style.display = 'none'; return; }
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
