// Entrance motion for the redesign pages: hero children rise on load, and
// data-anim / data-anim-group / data-bar / data-tick elements play when they
// scroll into view. Reduced motion shows everything instantly.

const timers = [];
const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };

export function initMotion() {
  const q = (s, root) => Array.from((root || document).querySelectorAll(s));
  const CUB = 'cubic-bezier(0.2,0,0,1)';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    q('[data-hero] > *, [data-hero-panel], [data-anim], [data-anim-group] > *, [data-attention]').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    q('[data-tick]').forEach((el) => {
      el.textContent = (el.dataset.prefix || '+') + el.dataset.tick;
    });
    return;
  }

  const prep = (el, from, dur) => {
    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = from;
    void el.offsetWidth;
    el.style.transition = 'opacity ' + dur + 's ' + CUB + ', transform ' + dur + 's ' + CUB;
  };
  const show = (el, delay) => later(() => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  }, delay || 0);

  const pending = [];
  const onceVisible = (el, cb) => pending.push({ trigger: el, play: cb });

  q('[data-hero] > *').forEach((el, i) => { prep(el, 'translateY(22px)', 0.75); show(el, 60 + i * 70); });
  q('[data-hero-panel]').forEach((el) => { prep(el, 'translateY(28px) scale(0.99)', 0.9); show(el, 300); });

  q('[data-anim]').forEach((el) => {
    prep(el, 'translateY(26px)', 0.72);
    onceVisible(el, () => show(el, 0));
  });

  q('[data-anim-group]').forEach((grp) => {
    const kids = Array.from(grp.children);
    kids.forEach((k) => prep(k, 'translateY(22px)', 0.65));
    onceVisible(grp, () => kids.forEach((k, i) => show(k, i * 85)));
  });

  q('[data-bar]').forEach((el) => {
    el.style.transform = 'scaleX(0)';
    el.style.transition = 'transform 0.9s ' + CUB;
    onceVisible(el, () => later(() => { el.style.transform = 'scaleX(1)'; }, 150));
  });

  q('[data-tick]').forEach((el) => {
    const target = Number(el.dataset.tick);
    const prefix = el.dataset.prefix || '+';
    el.textContent = prefix + '0';
    onceVisible(el, () => {
      const t0 = Date.now();
      const id = every(() => {
        const p = Math.min(1, (Date.now() - t0) / 1100);
        el.textContent = prefix + String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p === 1) clearInterval(id);
      }, 40);
    });
  });

  let driver = null;
  const tick = () => {
    const vh = window.innerHeight;
    for (let i = pending.length - 1; i >= 0; i--) {
      const r = pending[i].trigger.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > -40) pending.splice(i, 1)[0].play();
    }
    if (!pending.length && driver) { clearInterval(driver); driver = null; }
  };
  tick();
  driver = every(tick, 120);
  later(() => {
    while (pending.length) pending.pop().play();
    if (driver) { clearInterval(driver); driver = null; }
  }, 6000);
}
