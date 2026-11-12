// Landing entry: shared navigation, actions, proof and product-board behavior.
// HeroSculpture initializes its optional renderer through its own Astro script.

import { initActions } from './actions.js';
import { initTheme } from './theme.js';
import { initNav } from './nav.js';
import { initDownloads } from './downloads.js';
import { loadProof } from './stats.js';
import { initMotion } from './motion.js';
import { initBoard } from './board.js';

initActions();
initTheme();
initMotion();
loadProof();
initDownloads();
initBoard();
initNav();
