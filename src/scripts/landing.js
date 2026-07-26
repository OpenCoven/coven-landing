function wireRovingTabs(root, tabSelector, panelSelector, valueAttribute) {
  if (!root) return;
  var tabs = Array.from(root.querySelectorAll(tabSelector));
  var panels = Array.from(root.querySelectorAll(panelSelector));
  if (!tabs.length || !panels.length) return;

  function select(tab, moveFocus) {
    var value = tab.getAttribute(valueAttribute);
    tabs.forEach(function (candidate) {
      var active = candidate === tab;
      candidate.setAttribute('aria-selected', active ? 'true' : 'false');
      candidate.setAttribute('tabindex', active ? '0' : '-1');
    });
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute(valueAttribute.replace('tab', 'panel')) !== value;
    });
    if (moveFocus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { select(tab, false); });
    tab.addEventListener('keydown', function (event) {
      var nextIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      select(tabs[nextIndex], true);
    });
  });
}

wireRovingTabs(
  document.querySelector('[data-familiar-switcher]'),
  '[data-familiar-tab]',
  '[data-familiar-panel]',
  'data-familiar-tab',
);

(function wireContinuityStory() {
  var root = document.querySelector('[data-continuity-story]');
  if (!root) return;

  var stages = Array.from(root.querySelectorAll('[data-story-stage]'));
  var anchors = Array.from(root.querySelectorAll('[data-story-anchor]'));
  var panels = Array.from(root.querySelectorAll('[data-story-panel]'));
  var visual = root.querySelector('.story-visual');
  var transitionTimer = null;
  var activeId = stages[0]?.getAttribute('data-story-stage');
  var motionOn = document.documentElement.classList.contains('motion-on');

  function paint(id) {
    var index = stages.findIndex(function (stage) {
      return stage.getAttribute('data-story-stage') === id;
    });
    if (index < 0 || id === activeId) return;
    activeId = id;

    stages.forEach(function (stage) {
      stage.classList.toggle(
        'is-active',
        stage.getAttribute('data-story-stage') === id,
      );
    });
    anchors.forEach(function (anchor) {
      var selected = anchor.getAttribute('data-story-anchor') === id;
      if (selected) anchor.setAttribute('aria-current', 'step');
      else anchor.removeAttribute('aria-current');
    });

    var updatePanels = function () {
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-story-panel') !== id;
      });
      root.style.setProperty(
        '--story-progress',
        `${(index / Math.max(stages.length - 1, 1)) * 100}%`,
      );
    };

    if (!motionOn || !visual) {
      updatePanels();
      return;
    }

    if (transitionTimer) window.clearTimeout(transitionTimer);
    visual.classList.add('is-transitioning');
    transitionTimer = window.setTimeout(function () {
      updatePanels();
      requestAnimationFrame(function () {
        visual.classList.remove('is-transitioning');
      });
    }, 180);
  }

  anchors.forEach(function (anchor) {
    anchor.addEventListener('click', function () {
      paint(anchor.getAttribute('data-story-anchor'));
    });
  });

  if (!('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          paint(entry.target.getAttribute('data-story-stage'));
        }
      });
    },
    { rootMargin: '-35% 0px -55% 0px', threshold: 0 },
  );
  stages.forEach(function (stage) {
    observer.observe(stage);
  });
})();

(function wireRuntimeProof() {
  var root = document.querySelector('[data-runtime-proof]');
  if (!root) return;

  var tabs = Array.from(root.querySelectorAll('[data-runtime-tab]'));
  var panels = Array.from(root.querySelectorAll('[data-runtime-panel]'));
  var panelRoot = root.querySelector('.runtime-panels');
  var animationFrame = null;
  var motionOn = document.documentElement.classList.contains('motion-on');

  function select(tab, moveFocus) {
    var id = tab.getAttribute('data-runtime-tab');
    var changed = tab.getAttribute('aria-selected') !== 'true';

    tabs.forEach(function (candidate) {
      var active = candidate === tab;
      candidate.setAttribute('aria-selected', active ? 'true' : 'false');
      candidate.setAttribute('tabindex', active ? '0' : '-1');
    });
    panels.forEach(function (panel) {
      panel.classList.toggle(
        'is-active',
        panel.getAttribute('data-runtime-panel') === id,
      );
    });
    if (moveFocus) tab.focus();

    if (!changed || !motionOn || !panelRoot) return;

    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    panelRoot.style.transition = 'none';
    panelRoot.style.opacity = '0.12';
    panelRoot.getBoundingClientRect();
    panelRoot.style.transition = '';
    animationFrame = window.requestAnimationFrame(function () {
      panelRoot.style.opacity = '';
      animationFrame = null;
    });
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      select(tab, false);
    });
    tab.addEventListener('keydown', function (event) {
      var nextIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      select(tabs[nextIndex], true);
    });
  });
})();

(function wireFeedback() {
  var launcher = document.querySelector('[data-feedback-launcher]');
  var label = launcher?.querySelector('[data-feedback-label]');
  var status = document.querySelector('[data-feedback-status]');
  if (!launcher || !label) return;

  var loading = false;
  var ready = false;
  var failed = false;
  var attemptToken = 0;
  var loadTimer = null;
  var activeScript = null;
  var loadHandler = null;
  var errorHandler = null;
  var SDK_LOAD_TIMEOUT_MS = 5_000;
  var instanceUrl = 'https://feedback.opencoven.ai';
  var sdkUrl = `${instanceUrl}/api/widget/sdk.js`;

  function announce(message) {
    if (status) status.textContent = message;
  }

  function cleanupAttempt() {
    if (loadTimer) {
      window.clearTimeout(loadTimer);
      loadTimer = null;
    }
    if (activeScript && loadHandler) {
      activeScript.removeEventListener('load', loadHandler);
    }
    if (activeScript && errorHandler) {
      activeScript.removeEventListener('error', errorHandler);
    }
    activeScript = null;
    loadHandler = null;
    errorHandler = null;
  }

  function fail(attempt) {
    if (failed || (attempt !== undefined && attempt !== attemptToken)) return;
    cleanupAttempt();
    attemptToken += 1;
    loading = false;
    ready = false;
    failed = true;
    launcher.removeAttribute('aria-busy');
    launcher.dataset.feedbackState = 'failed';
    label.textContent = 'Feedback unavailable · open Discord';
    announce('Feedback widget unavailable. Use the Discord fallback link.');
  }

  function openFeedback() {
    try {
      if (typeof window.Quackback !== 'function') {
        throw new Error('Feedback SDK unavailable');
      }
      window.Quackback('open');
      announce('Feedback opened.');
    } catch {
      fail();
    }
  }

  function activateFeedback(event) {
    if (failed) return;
    event.preventDefault();
    if (ready) {
      openFeedback();
      return;
    }
    if (loading) return;

    loading = true;
    var currentAttempt = ++attemptToken;
    launcher.setAttribute('aria-busy', 'true');
    label.textContent = 'Opening feedback…';
    var script = document.createElement('script');
    script.id = 'opencoven-feedback-sdk';
    script.async = true;
    script.src = sdkUrl;
    activeScript = script;
    loadHandler = function () {
      if (failed || currentAttempt !== attemptToken) return;
      cleanupAttempt();
      try {
        window.Quackback('init', {
          instanceUrl,
          launcher: false,
        });
        loading = false;
        ready = true;
        launcher.removeAttribute('aria-busy');
        label.textContent = 'Feedback';
        openFeedback();
      } catch {
        fail();
      }
    };
    errorHandler = function () {
      fail(currentAttempt);
    };
    script.addEventListener('load', loadHandler);
    script.addEventListener('error', errorHandler);
    loadTimer = window.setTimeout(function () {
      fail(currentAttempt);
    }, SDK_LOAD_TIMEOUT_MS);
    document.head.appendChild(script);
  }

  launcher.addEventListener('click', activateFeedback);
})();
