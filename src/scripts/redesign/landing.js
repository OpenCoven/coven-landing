// Landing page entry — wires every behavior module in the order the original
// component mounted them. The hero has no script of its own any more: the
// interactive dial was removed, and the session table is the hero visual.

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
