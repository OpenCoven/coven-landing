const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

const hasMatchMedia = typeof window.matchMedia === 'function';
const motionPreference = hasMatchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;
const pinnedLayout = hasMatchMedia
  ? window.matchMedia('(min-width: 901px)')
  : null;
const prefersReducedMotion = () => motionPreference?.matches ?? false;
const usesPinnedLayout = () =>
  pinnedLayout?.matches ?? window.innerWidth >= 901;
let configureCopyButton = (button, command, label) => {
  if (!button) return;
  button.dataset.copyCommand = command;
  button.setAttribute('aria-label', label);
};

function selectRuntime(selected) {
  const chips = [...document.querySelectorAll('[data-runtime-chip]')];
  const commandPanel = document.querySelector(
    '[data-runtime-command-panel]',
  );
  const wasSelected = selected.getAttribute('aria-pressed') === 'true';
  const name = selected.textContent?.trim() ?? '';
  const command = selected.dataset.command ?? '';

  chips.forEach((chip) => {
    chip.setAttribute(
      'aria-pressed',
      String(!wasSelected && chip === selected),
    );
  });
  if (commandPanel) commandPanel.dataset.active = String(!wasSelected);
  if (wasSelected) return;

  const nameNode = document.querySelector('[data-runtime-name]');
  const commandNode = document.querySelector('[data-runtime-command]');
  const copyButton = document
    .querySelector('[data-runtime-command]')
    ?.closest('[data-copy-surface]')
    ?.querySelector('[data-copy-command]');

  if (nameNode) nameNode.textContent = name;
  if (commandNode) commandNode.textContent = command;
  if (copyButton) {
    configureCopyButton(
      copyButton,
      command,
      `Copy ${name} command`,
    );
  }
}

document.querySelectorAll('[data-runtime-chip]').forEach((chip) => {
  chip.addEventListener('click', () => selectRuntime(chip));
});

const runtimeMarquee = document.querySelector('.runtime-marquee');
if (runtimeMarquee && !prefersReducedMotion()) {
  const startMarquee = () => {
    window.setTimeout(() => {
      runtimeMarquee.classList.add('is-marquee-active');
    }, 1800);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        startMarquee();
      },
      { rootMargin: '120px' },
    );
    observer.observe(runtimeMarquee);
  } else {
    startMarquee();
  }
}

const boundary = document.querySelector('[data-boundary]');
const boundaryTabs = [
  ...document.querySelectorAll('[data-boundary-tab]'),
];
const boundaryPanels = [
  ...document.querySelectorAll('[data-boundary-panel]'),
];
let activeBoundaryIndex = -1;

function selectBoundary(index, { focus = false } = {}) {
  if (!boundary || !boundaryTabs[index]) return;
  if (index === activeBoundaryIndex) {
    if (focus) boundaryTabs[index].focus();
    return;
  }

  const selectedTab = boundaryTabs[index];
  const selectedLayer = selectedTab.dataset.boundaryTab ?? '';
  activeBoundaryIndex = index;

  boundary.dataset.activeLayer = selectedLayer;
  boundaryTabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  });
  boundaryPanels.forEach((panel) => {
    const selected = panel.dataset.boundaryPanel === selectedLayer;
    panel.hidden = !selected;
    panel.dataset.active = String(selected);
  });
}

boundaryTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectBoundary(index));
  tab.addEventListener('keydown', (event) => {
    let nextIndex = index;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % boundaryTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + boundaryTabs.length) % boundaryTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = boundaryTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectBoundary(nextIndex, { focus: true });
  });
});

const initialBoundaryIndex = Math.max(
  0,
  boundaryTabs.findIndex(
    (tab) => tab.getAttribute('aria-selected') === 'true',
  ),
);
selectBoundary(initialBoundaryIndex);

const surfaceCards = [...document.querySelectorAll('[data-surface-card]')];
let activeSurfaceIndex = Math.max(
  0,
  surfaceCards.findIndex((card) => card.dataset.expanded === 'true'),
);

function selectSurface(index) {
  if (!surfaceCards[index] || index === activeSurfaceIndex) return;
  activeSurfaceIndex = index;
  surfaceCards.forEach((card, cardIndex) => {
    const selected = cardIndex === index;
    card.dataset.expanded = String(selected);
    card
      .querySelector('[data-surface-trigger]')
      ?.setAttribute('aria-expanded', String(selected));
  });
}

surfaceCards.forEach((card, index) => {
  const trigger = card.querySelector('[data-surface-trigger]');
  trigger?.addEventListener('click', () => selectSurface(index));
  trigger?.addEventListener('focus', () => selectSurface(index));
});

const invocationSteps = [
  ...document.querySelectorAll('[data-invocation-step]'),
];
const terminalLabel = document.querySelector('[data-terminal-label]');
const terminalCommand = document.querySelector('[data-terminal-command]');
const terminalOutput = document.querySelector('[data-terminal-output]');
const terminalCopy = document
  .querySelector('[data-terminal-command]')
  ?.closest('[data-copy-surface]')
  ?.querySelector('[data-copy-command]');
let activeInvocationIndex = Math.max(
  0,
  invocationSteps.findIndex(
    (step) => step.getAttribute('aria-pressed') === 'true',
  ),
);

function selectInvocation(index) {
  const selectedStep = invocationSteps[index];
  if (!selectedStep || index === activeInvocationIndex) return;
  activeInvocationIndex = index;

  const command = selectedStep.dataset.command ?? '';
  const label = selectedStep.dataset.label ?? '';
  let output = [];

  try {
    output = JSON.parse(selectedStep.dataset.output ?? '[]');
  } catch {
    output = [];
  }

  invocationSteps.forEach((step, stepIndex) => {
    const selected = stepIndex === index;
    step.setAttribute('aria-pressed', String(selected));
    const cue = step.querySelector('em');
    if (cue) cue.textContent = selected ? 'running' : 'run';
  });

  if (terminalLabel) terminalLabel.textContent = label;
  if (terminalCommand) terminalCommand.textContent = command;
  if (terminalCopy) {
    configureCopyButton(
      terminalCopy,
      command,
      `Copy ${label} command`,
    );
  }
  if (terminalOutput) {
    terminalOutput.replaceChildren(
      ...output.map((line) => {
        const row = document.createElement('p');
        row.dataset.tone = line.tone ?? 'default';
        row.textContent = line.text ?? '';
        return row;
      }),
    );
  }
}

invocationSteps.forEach((step, index) => {
  step.addEventListener('click', () => selectInvocation(index));
});

function wireCopyControls() {
  const buttons = [...document.querySelectorAll('[data-copy-command]')];
  const guidanceNodes = [
    ...document.querySelectorAll('[data-copy-guidance]'),
  ];
  const liveRegion = document.querySelector('[data-copy-live]');
  const fallbackMessage =
    'Copy unavailable. Command selected. Press Ctrl+C or Command+C to copy manually.';
  const states = new WeakMap();
  let latestRequestToken = 0;

  function announce(message) {
    if (liveRegion) liveRegion.textContent = message;
  }

  function clearGuidance() {
    guidanceNodes.forEach((guidance) => {
      guidance.hidden = true;
      guidance.textContent = '';
      guidance
        .closest('[data-copy-surface]')
        ?.classList.remove('has-copy-guidance');
    });
  }

  function showGuidance(button) {
    const surface = button.closest('[data-copy-surface]');
    const guidance = surface?.querySelector('[data-copy-guidance]');
    if (!surface || !guidance) return;

    guidance.textContent = fallbackMessage;
    guidance.hidden = false;
    surface.classList.add('has-copy-guidance');
  }

  function selectCommand(button, command) {
    const surface =
      button.closest('[data-copy-surface]') ?? button.parentElement;
    const codeNodes = [...(surface?.querySelectorAll('code') ?? [])];
    const code =
      codeNodes.find((node) => node.textContent?.includes(command)) ??
      codeNodes[0];
    if (!code) return;

    const textNodes = [];
    const walker = document.createTreeWalker(
      code,
      NodeFilter.SHOW_TEXT,
    );
    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    const fullText = textNodes.map((node) => node.textContent ?? '').join('');
    const commandStart = fullText.indexOf(command);
    if (commandStart < 0) return;
    const commandEnd = commandStart + command.length;

    function boundaryAt(offset) {
      let consumed = 0;
      for (const node of textNodes) {
        const length = node.textContent?.length ?? 0;
        if (offset <= consumed + length) {
          return { node, offset: offset - consumed };
        }
        consumed += length;
      }
      const node = textNodes.at(-1);
      return node
        ? { node, offset: node.textContent?.length ?? 0 }
        : null;
    }

    const start = boundaryAt(commandStart);
    const end = boundaryAt(commandEnd);
    if (!start || !end) return;

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    selection?.removeAllRanges();
    selection?.addRange(range);
    button.focus({ preventScroll: true });
  }

  function resetButton(button, { invalidate = false } = {}) {
    const state = states.get(button);
    if (!state) return;
    if (invalidate) state.attemptToken += 1;
    if (state.resetTimer) {
      window.clearTimeout(state.resetTimer);
      state.resetTimer = undefined;
    }
    button.classList.remove('is-copied', 'is-copy-failed');
    button.textContent = state.idleText;
    button.setAttribute('aria-label', state.idleLabel);
  }

  buttons.forEach((button) => {
    states.set(button, {
      attemptToken: 0,
      idleLabel: button.getAttribute('aria-label') ?? 'Copy command',
      idleText: button.textContent?.trim() || 'copy',
      resetTimer: undefined,
    });
  });

  configureCopyButton = (button, command, label) => {
    if (!button) return;
    button.dataset.copyCommand = command;
    const state = states.get(button);
    if (!state) {
      button.setAttribute('aria-label', label);
      return;
    }
    state.idleLabel = label;
    clearGuidance();
    resetButton(button, { invalidate: true });
  };

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const state = states.get(button);
      if (!state) return;
      const currentAttempt = ++state.attemptToken;
      const requestToken = ++latestRequestToken;
      const command = button.dataset.copyCommand ?? '';

      clearGuidance();
      buttons.forEach((otherButton) => {
        if (otherButton === button) return;
        resetButton(otherButton, { invalidate: true });
      });

      if (state.resetTimer) {
        window.clearTimeout(state.resetTimer);
        state.resetTimer = undefined;
      }
      button.classList.remove('is-copied', 'is-copy-failed');
      button.textContent = state.idleText;
      button.setAttribute('aria-label', state.idleLabel);

      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error('Clipboard API unavailable');
        }
        await navigator.clipboard.writeText(command);
        if (
          currentAttempt !== state.attemptToken ||
          requestToken !== latestRequestToken
        ) {
          return;
        }

        button.classList.remove('is-copy-failed');
        button.classList.add('is-copied');
        button.textContent = 'copied';
        button.setAttribute('aria-label', 'Copied');
        announce(`Copied: ${command}`);

        state.resetTimer = window.setTimeout(() => {
          if (currentAttempt !== state.attemptToken) return;
          resetButton(button);
        }, 1400);
      } catch {
        if (
          currentAttempt !== state.attemptToken ||
          requestToken !== latestRequestToken
        ) {
          return;
        }

        button.classList.remove('is-copied');
        button.classList.add('is-copy-failed');
        button.textContent = state.idleText;
        button.setAttribute(
          'aria-label',
          'Copy unavailable. Select the command and copy manually.',
        );
        selectCommand(button, command);
        showGuidance(button);
        announce(fallbackMessage);
      }
    });
  });
}

wireCopyControls();
document.documentElement.classList.add('reforged-ready');

const progressBar = document.querySelector('[data-scroll-progress]');
const surfacesSection = document.querySelector('[data-surfaces]');
const invocationSection = document.querySelector('[data-invocation]');
let framePending = false;

function pinnedProgress(section) {
  const rect = section.getBoundingClientRect();
  const distance = Math.max(1, rect.height - window.innerHeight);
  return clamp(-rect.top / distance);
}

function sectionIsPinned(section) {
  const rect = section.getBoundingClientRect();
  return rect.top <= 0 && rect.bottom >= window.innerHeight;
}

function phaseIndex(progress, count) {
  return Math.min(count - 1, Math.floor(progress * count));
}

function renderScrollState() {
  framePending = false;
  const scrollable = Math.max(
    1,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const pageProgress = clamp(window.scrollY / scrollable);
  if (progressBar) {
    progressBar.style.setProperty(
      '--scroll-progress',
      `${(pageProgress * 100).toFixed(3)}%`,
    );
  }

  const canScrub = !prefersReducedMotion() && usesPinnedLayout();

  if (canScrub) {
    if (
      boundary &&
      boundaryTabs.length &&
      sectionIsPinned(boundary)
    ) {
      selectBoundary(
        phaseIndex(pinnedProgress(boundary), boundaryTabs.length),
      );
    }
    if (
      surfacesSection &&
      surfaceCards.length &&
      sectionIsPinned(surfacesSection)
    ) {
      selectSurface(
        phaseIndex(pinnedProgress(surfacesSection), surfaceCards.length),
      );
    }
    if (
      invocationSection &&
      invocationSteps.length &&
      sectionIsPinned(invocationSection)
    ) {
      selectInvocation(
        phaseIndex(
          pinnedProgress(invocationSection),
          invocationSteps.length,
        ),
      );
    }
  }
}

function requestScrollRender() {
  if (framePending) return;
  framePending = true;
  window.requestAnimationFrame(renderScrollState);
}

function handleMotionPreferenceChange() {
  requestScrollRender();
}

window.addEventListener('scroll', requestScrollRender, { passive: true });
window.addEventListener('resize', requestScrollRender, { passive: true });
if (pinnedLayout?.addEventListener) {
  pinnedLayout.addEventListener('change', requestScrollRender);
} else {
  pinnedLayout?.addListener?.(requestScrollRender);
}
if (motionPreference?.addEventListener) {
  motionPreference.addEventListener(
    'change',
    handleMotionPreferenceChange,
  );
} else {
  motionPreference?.addListener?.(handleMotionPreferenceChange);
}
requestScrollRender();
