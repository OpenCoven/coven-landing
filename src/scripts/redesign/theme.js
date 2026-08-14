// Theme toggle for the redesign pages. ThemeInit (in <head>) resolves the
// saved preference before first paint and stamps <html data-theme>; this
// module owns the toggle button. A click sets an explicit light/dark
// preference under the same 'theme' key ThemeInit reads.

import { register, updateBinding } from './actions.js';

function paint() {
  const dark = document.documentElement.dataset.theme !== 'light';
  updateBinding('themeIcon', dark ? 'ph-moon-stars' : 'ph-sun-dim');
  updateBinding('themeAria', dark ? 'Switch to light mode' : 'Switch to dark mode');
}

export function initTheme() {
  register('toggleTheme', () => {
    const html = document.documentElement;
    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    html.dataset.theme = next;
    html.dataset.themePref = next;
    paint();
  });
  paint();
}
