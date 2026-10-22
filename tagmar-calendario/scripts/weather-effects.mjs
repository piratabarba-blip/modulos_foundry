import {environmentInfo, normalizeClimate} from "./weather.mjs";
import {fadeSeconds} from "./weather-transition.mjs";

const ID = "tagmar-calendario";

// IDs conferidos no CONFIG.weatherEffects do Foundry 14.369.
// undefined significa indisponível: não apagar um efeito por engano.
export function nativeWeatherEffect(weather, effects = {}) {
  if (!weather) return undefined;
  const choices = {
    clear: [""], cloudy: [""], overcast: [""],
    drizzle: ["rain"], rain: ["rain"], storm: ["rainStorm", "rain"],
    fog: ["fog"], snow: weather.wind >= 35 ? ["blizzard", "snow"] : ["snow"]
  };
  return choices[weather.condition]?.find(id => id === "" || Object.hasOwn(effects, id));
}

// Um GM grava o documento compartilhado, sem manipular diretamente o canvas.
// A fila relê cena/configuração após cada gravação, inclusive ao trocar de cena.
export function createWeatherEffectsSync({getGame, getDate, getEffects, getFadeSeconds = () => 0,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  newToken = () => globalThis.crypto.randomUUID(), onError = console.error}) {
  let pending = false, running, reportedFailure = false;
  return function sync() {
    pending = true;
    if (running) return running;
    running = Promise.resolve().then(async () => {
      while (pending) {
        pending = false;
        const game = getGame();
        const leader = game.users.filter(u => u.active && u.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
        if (!game.user?.isGM || leader?.id !== game.user.id) continue;
        const scene = game.scenes?.active;
        if (!scene) continue;
        const config = normalizeClimate(scene.getFlag(ID, "climate"));
        const raw = scene.getFlag(ID, "weatherVisualState");
        const owned = raw && typeof raw.previous === "string" && typeof raw.applied === "string" ? raw : null;
        const effects = getEffects() ?? {};
        const current = scene.weather ?? "";
        let changes;
        if (!config.visualEffects || config.mode === "off" || config.biome === "interior") {
          if (!owned) continue;
          changes = {[`flags.${ID}.-=weatherVisualState`]: null};
          // Não sobrescrever uma escolha manual feita após nosso último efeito.
          if (current === owned.applied) {
            const previous = owned.previous === "" || Object.hasOwn(effects, owned.previous) ? owned.previous : "";
            if (current !== previous) changes.weather = previous;
          }
        } else {
          const target = nativeWeatherEffect(environmentInfo(scene, getDate(), game.time.worldTime).weather, effects);
          if (target === undefined || (current === target && (!owned || owned.applied === target))) continue;
          changes = {
            weather: target,
            [`flags.${ID}.weatherVisualState`]: {previous: owned?.previous ?? current, applied: target}
          };
        }
        let prepared = false;
        try {
          const seconds = fadeSeconds(getFadeSeconds());
          if ('weather' in changes && changes.weather !== current && seconds > 0) {
            // Aviso compartilhado chega aos clientes antes da atualização nativa
            // que redesenha o canvas. Não usar socket sem autenticação de remetente.
            await scene.update({[`flags.${ID}.weatherTransition`]: {
              token: newToken(), from: current, target: changes.weather, seconds
            }}, {tagmarWeatherEffects: true, tagmarWeatherPrepare: true});
            prepared = true;
            if (current) await sleep(seconds * 500);
            const latest = getGame();
            const latestLeader = latest.users.filter(u => u.active && u.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
            const latestConfig = normalizeClimate(scene.getFlag(ID, 'climate'));
            const latestTarget = latestConfig.visualEffects && latestConfig.mode !== 'off' && latestConfig.biome !== 'interior'
              ? nativeWeatherEffect(environmentInfo(scene, getDate(), latest.time.worldTime).weather, getEffects() ?? {}) : changes.weather;
            if (!latest.user?.isGM || latestLeader?.id !== latest.user.id || latest.scenes?.active !== scene
              || scene.weather !== current || JSON.stringify(latestConfig) !== JSON.stringify(config) || latestTarget !== changes.weather) {
              await scene.update({[`flags.${ID}.-=weatherTransition`]: null}, {tagmarWeatherEffects:true, tagmarWeatherCancel:true});
              prepared = false;
              pending = true;
              continue;
            }
            changes[`flags.${ID}.-=weatherTransition`] = null;
          }
          await scene.update(changes, {tagmarWeatherEffects: true});
          prepared = false;
          reportedFailure = false;
        } catch (error) {
          if (prepared) {
            try { await scene.update({[`flags.${ID}.-=weatherTransition`]: null}, {tagmarWeatherEffects:true, tagmarWeatherCancel:true}); }
            catch { /* O watchdog visual dos clientes restaura a opacidade. */ }
          }
          pending = false;
          if (!reportedFailure) onError(error);
          reportedFailure = true;
        }
      }
    }).finally(() => {
      running = undefined;
      if (pending) return sync();
    });
    return running;
  };
}
