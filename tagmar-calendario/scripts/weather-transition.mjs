// Anima apenas o contêiner de clima. Os shaders nativos usam mesh.worldAlpha.
// Não substitui métodos internos nem captura/recria efeitos, visão ou máscaras.
export function fadeSeconds(value) {
  return Number.isFinite(Number(value)) ? Math.min(10, Math.max(0, Number(value))) : 3;
}

export function createWeatherTransition({getCanvas, now = () => performance.now(),
  requestFrame = fn => requestAnimationFrame(fn), cancelFrame = id => cancelAnimationFrame(id),
  setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id)}) {
  let pending, frame, timer, container;
  function stopFrame() {
    if (frame !== undefined) cancelFrame(frame);
    frame = undefined;
  }
  function reset() {
    stopFrame();
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
    if (container && !container.destroyed) container.alpha = 1;
    container = undefined;
    pending = undefined;
  }
  function animate(target, duration, done) {
    stopFrame();
    const item = container, started = now(), from = item?.alpha ?? 1;
    if (!item || item.destroyed) return done?.();
    const step = () => {
      if (item.destroyed || getCanvas()?.scene?.id !== pending?.sceneId) { reset(); return; }
      const t = duration > 0 ? Math.min(1, Math.max(0, (now() - started) / duration)) : 1;
      item.alpha = from + (target - from) * t * t * (3 - 2 * t);
      if (t < 1) frame = requestFrame(step);
      else { frame = undefined; done?.(); }
    };
    step();
  }
  function begin(scene, data) {
    const canvas = getCanvas();
    if (!data || typeof data.token !== 'string' || typeof data.target !== 'string'
      || !canvas?.ready || canvas.scene?.id !== scene.id || scene.weather !== data.from) return;
    if (pending?.token === data.token) return;
    reset();
    const seconds = fadeSeconds(data.seconds);
    if (!seconds) return;
    pending = {...data, sceneId: scene.id, half: seconds * 500};
    container = canvas.weather?.weatherEffects;
    // Falha de rede/GM desconectado: nunca deixar o clima invisível para sempre.
    timer = setTimer(reset, seconds * 1000 + 15000);
    if (data.from) animate(0, pending.half);
  }
  function initialize(layer, effect) {
    const canvas = getCanvas();
    if (!pending) return;
    if (canvas?.scene?.id !== pending.sceneId) { reset(); return; }
    // O redraw primeiro chama clearEffects no contêiner antigo. Não confundir
    // essa destruição com a construção do novo efeito (inclusive céu limpo).
    if (!effect && !canvas.ready && layer.weatherEffects === container) {
      stopFrame();
      container = undefined;
      return;
    }
    if ((effect?.id ?? '') !== pending.target) { reset(); return; }
    stopFrame();
    if (container && !container.destroyed) container.alpha = 1;
    container = layer.weatherEffects;
    if (container && !container.destroyed) container.alpha = 0;
    pending.initialized = true;
  }
  function ready() {
    if (!pending) return;
    const canvas = getCanvas();
    if (canvas?.scene?.id !== pending.sceneId || canvas.scene.weather !== pending.target || !pending.initialized) {
      reset(); return;
    }
    animate(1, pending.half, reset);
  }
  return {begin, initialize, ready, reset,
    canvasInit() { if (pending && getCanvas()?.scene?.id !== pending.sceneId) reset(); }};
}
