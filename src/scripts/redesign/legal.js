// Secondary-page entry (privacy, terms). These pages carry the redesign nav
// and footer but none of the landing page's islands — no braid, no board, no
// download menu, no live stats. Wiring only what the shared chrome needs keeps
// their initial JS well under the landing page's budget.

import { initActions } from './actions.js';
import { initTheme } from './theme.js';
import { initNav } from './nav.js';

initActions();
initTheme();
initNav();

// Index rail highlight. Same rule the how-it-works rail uses: a panel is
// active while it straddles the middle of the viewport, and the matching
// index entry and the panel border light with it.
const tocs = Array.from(document.querySelectorAll('[data-toc]'))
  .map((link) => ({ link, panel: document.getElementById(link.dataset.toc) }))
  .filter((t) => t.panel);

if (tocs.length) {
  const scrub = () => {
    const vh = window.innerHeight;
    tocs.forEach((t) => {
      const r = t.panel.getBoundingClientRect();
      const active = r.top < vh * 0.55 && r.bottom > vh * 0.45;
      t.link.style.color = active ? 'var(--cv-accent)' : 'var(--cv-text-muted)';
      t.panel.style.borderColor = active
        ? 'color-mix(in oklch, var(--cv-accent) 45%, transparent)'
        : 'var(--cv-border-hairline)';
      t.panel.style.boxShadow = active
        ? '0 10px 30px color-mix(in oklch, var(--cv-accent) 12%, transparent)'
        : 'none';
    });
  };
  scrub();
  window.addEventListener('scroll', scrub, { passive: true });
  window.addEventListener('resize', scrub);
}
