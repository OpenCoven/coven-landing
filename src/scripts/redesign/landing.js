// Landing page entry — wires every behavior module in the order the original
// component mounted them.

import { initActions } from './actions.js';
import { initTheme } from './theme.js';
import { initNav } from './nav.js';
import { initDownloads } from './downloads.js';
import { loadProof } from './stats.js';
import { initMotion } from './motion.js';
import { initHero, braidParallax } from './hero.js';
import { initBoard } from './board.js';

initActions();
initTheme();
initHero();
initMotion();
loadProof();
initDownloads();
initBoard();
initNav(braidParallax);
window.addEventListener('resize', braidParallax);
