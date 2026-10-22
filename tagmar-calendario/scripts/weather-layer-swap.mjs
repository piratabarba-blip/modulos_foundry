const ID = 'tagmar-calendario';

// Restrito às gravações de clima do próprio calendário. Qualquer alteração
// adicional (visão, dimensões, tokens, flags de terceiros...) usa o caminho nativo.
export function isWeatherOnlyUpdate(changed, options) {
  if (!options?.tagmarWeatherEffects || typeof changed?.weather !== 'string') return false;
  return Object.entries(changed).every(([key, value]) => {
    if (key === '_id' || key === 'weather') return true;
    // Metadados de revisão geridos pelo backend, sem efeito sobre o canvas.
    if (key === '_stats' || key.startsWith('_stats.')) return true;
    if (key.startsWith(`flags.${ID}.`)) return true;
    return key === 'flags' && value && typeof value === 'object'
      && Object.keys(value).every(namespace => namespace === ID);
  });
}

export function createWeatherLayerWrapper({getCanvas, getEffects, enabled, afterSwap, onFallback, onDiagnostic = () => {}}) {
  return function(wrapped, changed, options, userId) {
    const canvas = getCanvas();
    const effects = getEffects() ?? {};
    const reason = !enabled() ? 'option-disabled'
      : !isWeatherOnlyUpdate(changed, options) ? 'mixed-or-external-update'
      : !canvas?.ready ? 'canvas-not-ready'
      : canvas.scene !== this ? 'different-viewed-scene'
      : typeof canvas.weather?.initializeEffects !== 'function' ? 'weather-layer-unavailable'
      : changed.weather !== '' && !Object.hasOwn(effects, changed.weather) ? 'effect-unavailable' : null;
    const diagnostic = (event, detail) => {
      if (options?.tagmarWeatherEffects && typeof changed?.weather === 'string') {
        onDiagnostic({event, reason:detail, sceneId:this.id, target:changed.weather, keys:Object.keys(changed)});
      }
    };
    if (reason) {
      diagnostic('native-path',reason);
      return wrapped(changed, options, userId);
    }
    // O documento já está atualizado pelo Foundry. Só retiramos o gatilho de
    // redraw da cópia entregue ao _onUpdate; não alteramos dados, opções ou hooks.
    const visualChange = {...changed};
    delete visualChange.weather;
    const result = wrapped(visualChange, options, userId);
    const swap = () => {
      if (getCanvas() !== canvas || !canvas.ready || canvas.scene !== this) return;
      try {
        // Leia o estado mais recente caso outro update tenha chegado nesse meio.
        const latestEffects = getEffects() ?? {};
        if (this.weather && !Object.hasOwn(latestEffects, this.weather)) throw new Error('Efeito de clima indisponível durante a troca');
        const effect = latestEffects[this.weather];
        canvas.weather.initializeEffects(effect);
        afterSwap();
        diagnostic('layer-swapped');
      } catch (error) {
        diagnostic('native-fallback',String(error?.message ?? error));
        onFallback(error);
        // Recuperação excepcional, usando o redraw completo normal.
        return canvas.draw();
      }
    };
    if (result?.then) return result.then(async value => { await swap(); return value; });
    const recovery = swap();
    return recovery?.then ? recovery.then(() => result) : result;
  };
}

export function installWeatherLayerSwap({libWrapper, getCanvas, getEffects, enabled, afterSwap, onFallback, onDiagnostic}) {
  if (!libWrapper?.register) return false;
  libWrapper.register(ID, 'CONFIG.Scene.documentClass.prototype._onUpdate',
    createWeatherLayerWrapper({getCanvas, getEffects, enabled, afterSwap, onFallback, onDiagnostic}), 'WRAPPER');
  return true;
}
