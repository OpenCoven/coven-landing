// Delegated event wiring for the redesign pages. The design export bound
// handlers as onClick="{{ name }}"; the port rewrites those to
// data-action="name" and this registry dispatches them. Handlers receive the
// event with currentTarget patched to the actionable element, matching what
// the original class methods expect.

const registry = new Map();

export function register(name, fn) {
  registry.set(name, fn);
}

export function initActions() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = registry.get(el.dataset.action);
    if (!fn) return;
    Object.defineProperty(e, 'currentTarget', { value: el, configurable: true });
    fn(e);
  });
}

// data-dcb="name:attr" markers carry the export's value bindings. Each update
// re-applies one binding the way the dc runtime's re-render did.
export function updateBinding(name, value) {
  document.querySelectorAll(`[data-dcb="${name}:class"]`).forEach((el) => {
    el.className = 'ph ' + value; // themeIcon is the only class binding
  });
  document.querySelectorAll(`[data-dcb="${name}:style"]`).forEach((el) => {
    el.style.opacity = String(value); // hintOpacity is the only style binding
  });
  document.querySelectorAll(`[data-dcb^="${name}:"]`).forEach((el) => {
    const attr = el.dataset.dcb.split(':')[1];
    if (attr !== 'class' && attr !== 'style') el.setAttribute(attr, String(value));
  });
}
