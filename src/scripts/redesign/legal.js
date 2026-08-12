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
