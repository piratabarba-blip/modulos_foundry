// Modelo de ambientação, não uma regra astronômica oficial de Tagmar.
// Marcos do calendário: 15/Água, 15/Ouro, 15/Sangue, 15/Vida (índice zero).
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const mod = (v, n) => ((v % n) + n) % n;
const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;

export function solarDeclination(dayOfYear) {
  let day = mod(finite(dayOfYear, 0), 361);
  if (day < 44) day += 361;
  const anchors = [44, 134, 224, 314, 405];
  const quarter = anchors.findIndex((start, i) => i < 4 && day >= start && day < anchors[i + 1]);
  const phase = (quarter + (day - anchors[quarter]) / (anchors[quarter + 1] - anchors[quarter])) * Math.PI / 2;
  return 23.44 * Math.cos(phase);
}

export function solarState({dayOfYear = 0, secondsToday = 0, latitude = 0, twilightMinutes = 60, dayDarkness = 0, nightDarkness = 0.85} = {}) {
  const lat = clamp(finite(latitude, 0), -90, 90);
  const declination = solarDeclination(dayOfYear);
  const rad = Math.PI / 180;
  const cosHour = -Math.tan(lat * rad) * Math.tan(declination * rad);
  const dayHours = Math.abs(declination) < 1e-10 ? 12 : 24 * Math.acos(clamp(cosHour, -1, 1)) / Math.PI;
  const sunrise = 12 - dayHours / 2;
  const sunset = 12 + dayHours / 2;
  const hour = mod(finite(secondsToday, 0), 86400) / 3600;
  const day = clamp(finite(dayDarkness, 0), 0, 1);
  const night = Math.max(day, clamp(finite(nightDarkness, 0.85), 0, 1));
  const twilight = Math.min(clamp(finite(twilightMinutes, 60), 1, 240) / 60, dayHours, 24 - dayHours);
  let amount, phase;
  if (dayHours >= 24 - 1e-9) { amount = 0; phase = "Dia polar"; }
  else if (dayHours <= 1e-9) { amount = 1; phase = "Noite polar"; }
  else if (hour >= sunrise - twilight / 2 && hour <= sunrise + twilight / 2) {
    amount = 1 - (hour - sunrise + twilight / 2) / twilight;
    phase = "Amanhecer";
  } else if (hour >= sunset - twilight / 2 && hour <= sunset + twilight / 2) {
    amount = (hour - sunset + twilight / 2) / twilight;
    phase = "Entardecer";
  } else if (hour > sunrise && hour < sunset) { amount = 0; phase = "Dia"; }
  else { amount = 1; phase = "Noite"; }
  const smooth = amount * amount * (3 - 2 * amount);
  return {latitude: lat, declination, dayHours, sunrise, sunset, phase, darkness: day + (night - day) * smooth};
}

export function formatSolarHour(hour) {
  const minutes = mod(Math.round(hour * 60), 1440);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function darknessAnimationOptions(current, target, seconds = 2) {
  const duration = clamp(finite(seconds, 2), 0, 10) * 1000;
  // O relógio pode atualizar uma vez por segundo: os pequenos ajustes devem
  // terminar antes do próximo tick. Saltos maiores recebem o fade completo.
  const milliseconds = Math.abs(target - current) <= 0.01 ? Math.min(duration, 750) : duration;
  return {tagmarDayNight: true, animateDarkness: milliseconds > 0 ? milliseconds : false};
}

// Coalesce solicitações durante a gravação e relê o estado a cada passagem.
export function createDaylightSync({getGame, getDate, onError = console.error}) {
  let pending = false;
  let running;
  let reportedFailure = false;
  const moduleId = "tagmar-calendario";
  return function sync() {
    pending = true;
    if (running) return running;
    running = Promise.resolve().then(async () => {
      while (pending) {
        pending = false;
        const game = getGame();
        const leader = game.users.filter(u => u.active && u.isGM).sort((a, b) => a.id.localeCompare(b.id))[0];
        if (!game.user?.isGM || leader?.id !== game.user.id || !game.settings.get(moduleId, "dayNightEnabled")) continue;
        const scene = game.scenes?.active;
        if (scene?.getFlag(moduleId, "climate")?.biome === "interior") continue;
        if (!scene?.getFlag(moduleId, "dayNight")?.enabled || scene.environment?.darknessLock || scene.environment?.darknessLevelLock) continue;
        const state = solarState({
          dayOfYear: getDate().dayOfYear, secondsToday: game.time.worldTime,
          latitude: scene.getFlag(moduleId, "dayNight").latitude,
          twilightMinutes: game.settings.get(moduleId, "twilightMinutes"),
          dayDarkness: game.settings.get(moduleId, "dayDarkness"),
          nightDarkness: game.settings.get(moduleId, "nightDarkness")
        });
        const target = Math.round(state.darkness * 1000) / 1000;
        if (Math.abs(Number(scene.environment?.darknessLevel) - target) < 0.0005) continue;
        try {
          const options = darknessAnimationOptions(Number(scene.environment?.darknessLevel), target,
            game.settings.get(moduleId, "dayNightFadeSeconds"));
          await scene.update({"environment.darknessLevel": target}, options);
          reportedFailure = false;
        } catch (error) {
          pending = false;
          if (!reportedFailure) onError(error);
          reportedFailure = true;
        }
      }
    }).finally(() => {
      running = undefined;
      // Uma solicitação pode chegar entre o fim do loop e este microtask.
      if (pending) return sync();
    });
    return running;
  };
}
