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
