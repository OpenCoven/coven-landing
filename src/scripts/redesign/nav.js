// Frosted nav that hides on scroll-down and returns on any upward move.
// Always frosted — the bar reads as a surface at any scroll depth; only the
// hide transform depends on position.

let navY;
let hidden = false;
let onScrollExtra = null;

export function navScroll() {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;
  const y = Math.max(0, window.scrollY);
  const last = navY === undefined ? y : navY;
  const down = y > last + 2;
  const up = y < last - 2;
  if (y <= 10) hidden = false;
  else if (down && y > 90) hidden = true;
  else if (up) hidden = false;
  navY = y;

  nav.style.transform = hidden ? 'translateY(-100%)' : 'translateY(0)';
  nav.style.background = 'color-mix(in oklch, var(--cv-bg-base) 74%, transparent)';
  nav.style.backdropFilter = 'blur(14px) saturate(150%)';
  nav.style.webkitBackdropFilter = 'blur(14px) saturate(150%)';
  nav.style.borderBottomColor = 'var(--cv-border-hairline)';
  if (onScrollExtra) onScrollExtra();
}

export function initNav(extra) {
  onScrollExtra = extra || null;
  navScroll();
  window.addEventListener('scroll', navScroll, { passive: true });
}
