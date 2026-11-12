// The authored poster owns the first paint. WebGL is a desktop-only enhancement.
export function initSculpture() {
  const stage = document.querySelector('[data-hero-sculpture]');
  if (!stage || !window.matchMedia || !window.IntersectionObserver || !window.ResizeObserver) return;
  const viewport = stage.querySelector('[data-sculpture-viewport]');
  const button = stage.querySelector('[data-sculpture-pause]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1080px)');
  let scene = null;
  let loading = false;
  let failed = false;
  let paused = false;
  let visible = false;
  let frame = 0;
  let previous = 0;
  let elapsed = 0;
  let generation = 0;
  const pointer = { x: 0, y: 0 };
  const eligible = () => desktop.matches && !motion.matches && !failed;
  const running = () => scene && eligible() && visible && !document.hidden && !paused;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; };
  const tick = (now) => {
    frame = 0;
    // A frame may observe a changed preference before its media event arrives.
    if (!eligible()) { reconcile(); return; }
    if (!running()) return;
    if (now - previous >= 1000 / 30) {
      elapsed += previous ? Math.min((now - previous) / 1000, 0.1) : 0;
      previous = now;
      scene.render(elapsed, pointer);
    }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    stop();
    if (!scene) return;
    stage.dataset.state = paused ? 'paused' : 'live';
    if (running()) frame = requestAnimationFrame(tick);
  };
  const teardown = (state = 'poster') => {
    generation++;
    stop();
    scene?.dispose();
    scene = null;
    button.hidden = true;
    stage.dataset.state = state;
  };
  const reconcile = async () => {
    if (!eligible()) { teardown(failed ? 'fallback' : 'poster'); return; }
    if (scene) { sync(); return; }
    if (loading || !visible || document.hidden) return;
    const ticket = generation;
    loading = true;
    try {
      const { mountSculpture } = await import('./sculpture-scene.js');
      if (ticket !== generation || !eligible()) return;
      scene = mountSculpture(viewport);
      scene.render(0, pointer);
      button.hidden = false;
      sync();
    } catch {
      failed = true;
      teardown('fallback');
    } finally {
      loading = false;
      // A media change during import may have invalidated that attempt.
      if (!scene && eligible() && ticket !== generation) reconcile();
    }
  };
  button.addEventListener('click', () => {
    paused = !paused;
    button.setAttribute('aria-pressed', String(paused));
    button.querySelector('[data-sculpture-label]').textContent = paused ? 'Resume 3D motion' : 'Pause 3D motion';
    button.querySelector('[data-sculpture-icon]').textContent = paused ? '▷' : 'Ⅱ';
    sync();
  });
  viewport.addEventListener('pointermove', (event) => {
    if (paused) return;
    const rect = viewport.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width - 0.5;
    pointer.y = (event.clientY - rect.top) / rect.height - 0.5;
  }, { passive: true });
  viewport.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });
  viewport.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    failed = true;
    teardown('fallback');
  }, true);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; reconcile(); });
  observer.observe(stage);
  const resize = new ResizeObserver(() => { if (scene) { scene.resize(); scene.render(elapsed, pointer); } });
  resize.observe(viewport);
  motion.addEventListener('change', reconcile);
  desktop.addEventListener('change', reconcile);
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('pagehide', () => teardown(), { once: true });
  window.addEventListener('pageshow', reconcile);
}
