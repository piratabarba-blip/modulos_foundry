const ID = 'tagmar-calendario';
const DAY = 86400;
const mod = (n, d) => ((n % d) + d) % d;

export function calendarSecond(date, worldTime) {
  const day = Number.isFinite(date.year) && Number.isFinite(date.dayOfYear)
    ? date.year * 361 + date.dayOfYear : date.absoluteDay;
  return day * DAY + mod(worldTime, DAY);
}

// Derive expired state without writes, so players and disconnected GMs agree.
export function magicWeatherState(scene, date, worldTime) {
  const now = calendarSecond(date, worldTime);
  const stored = scene?.getFlag(ID, 'magicWeather');
  const valid = stored && Number.isFinite(stored.startsAt) && Number.isFinite(stored.endsAt)
    && stored.endsAt > stored.startsAt && stored.weather && typeof stored.weather === 'object';
  const magic = valid ? stored : null;
  const savedDelay = Number(scene?.getFlag(ID, 'weatherTimeDelay'));
  const delay = Number.isFinite(savedDelay) ? Math.max(0, savedDelay) : 0;
  const elapsed = magic ? Math.max(0, Math.min(now - magic.startsAt, magic.endsAt - magic.startsAt)) : 0;
  const active = Boolean(magic && now >= magic.startsAt && now < magic.endsAt);
  const weatherSecond = date.absoluteDay * DAY + mod(worldTime, DAY) - delay - elapsed;
  return {magic, active, expired: Boolean(magic && now >= magic.endsAt),
    remaining: active ? Math.ceil(magic.endsAt - now) : 0, delay: delay + elapsed,
    absoluteDay: Math.floor(weatherSecond / DAY), secondsToday: mod(weatherSecond, DAY)};
}

export function durationLabel(seconds) {
  const minutes = Math.ceil(Math.max(0, seconds) / 60);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export function magicDuration(hours, minutes) {
  const h = Number(hours), m = Number(minutes);
  if (!Number.isInteger(h) || h < 0 || h > 8760 || !Number.isInteger(m) || m < 0 || m > 59 || h * 60 + m <= 0)
    throw new Error('Informe uma duração maior que zero: até 8760 horas e de 0 a 59 minutos.');
  return h * 3600 + m * 60;
}

export function createMagicWeatherControl({getGame, getDate, onError = console.error}) {
  let queue = Promise.resolve();
  const serial = task => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };
  const checkGM = () => { if (!getGame().user?.isGM) throw new Error('Somente o mestre pode alterar o clima por magia.'); };
  const stop = async (scene, state) => {
    if (!state.magic) return;
    await scene.update({[`flags.${ID}.weatherTimeDelay`]: state.delay, [`flags.${ID}.-=magicWeather`]: null});
  };
  return {
    apply: (scene, weather, duration) => serial(async () => {
      checkGM();
      if (!scene || !Number.isFinite(duration) || duration <= 0 || duration > 8760 * 3600 + 59 * 60)
        throw new Error('Cena ou duração inválida.');
      if (!['clear','cloudy','overcast','fog','drizzle','rain','storm','snow'].includes(weather.condition)
        || !Number.isFinite(weather.temperature) || weather.temperature < -80 || weather.temperature > 65
        || !Number.isFinite(weather.wind) || weather.wind < 0 || weather.wind > 150
        || !Number.isFinite(weather.windDirection) || weather.windDirection < 0 || weather.windDirection >= 360)
        throw new Error('Confira os valores de temperatura, vento e direção.');
      const game = getGame(), date = getDate();
      const state = magicWeatherState(scene, date, game.time.worldTime);
      const startsAt = calendarSecond(date, game.time.worldTime);
      await scene.update({[`flags.${ID}.weatherTimeDelay`]: state.delay,
        [`flags.${ID}.magicWeather`]: {startsAt, endsAt: startsAt + duration, weather: {...weather}}});
    }),
    end: scene => serial(async () => {
      checkGM();
      await stop(scene, magicWeatherState(scene, getDate(), getGame().time.worldTime));
    }),
    sync: () => serial(async () => {
      const game = getGame();
      const leader = game.users?.filter(u => u.active && u.isGM).sort((a,b) => a.id.localeCompare(b.id))[0];
      if (!game.user?.isGM || leader?.id !== game.user.id) return;
      const scenes = game.scenes?.contents ?? (game.scenes?.active ? [game.scenes.active] : []);
      for (const scene of scenes) {
        const state = magicWeatherState(scene, getDate(), game.time.worldTime);
        if (state.expired) await stop(scene, state);
      }
    }).catch(onError)
  };
}
