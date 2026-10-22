import {solarDeclination} from "./daylight.mjs";
import {normalizeLunar, lunarTideState, lunarCalendarDay} from "./lunar.mjs";

// Parâmetros de ambientação fictícia, não dados meteorológicos ou regras de Tagmar.
export const BIOMES = Object.freeze({
  tropical: {label: "Floresta tropical", moisture: 0.85, offset: 1, daily: 2},
  temperate: {label: "Floresta temperada", moisture: 0.65, offset: -1, daily: 3},
  plains: {label: "Savana / campos", moisture: 0.4, offset: 0, daily: 4},
  desert: {label: "Deserto", moisture: 0.08, offset: 5, daily: 9},
  swamp: {label: "Pântano", moisture: 0.9, offset: 0, daily: 2},
  lake: {label: "Lago", moisture: 0.75, offset: 0, daily: 2, wind: 18},
  ocean: {label: "Oceano / região costeira", moisture: 0.8, offset: 0, daily: 1.5, wind: 24},
  open_sea: {label: "Mar aberto", moisture: 0.8, offset: 0, daily: 1, wind: 32},
  tundra: {label: "Tundra / região polar", moisture: 0.3, offset: -8, daily: 2},
  mountain: {label: "Montanha", moisture: 0.5, offset: -2, daily: 4},
  interior: {label: "Interior / subterrâneo", moisture: 0, offset: 0, daily: 0}
});
export const CONDITIONS = Object.freeze({
  clear: ["Céu limpo", "☀️"], cloudy: ["Parcialmente nublado", "🌤️"], overcast: ["Nublado", "☁️"],
  fog: ["Neblina", "🌫️"], drizzle: ["Chuva leve", "🌦️"], rain: ["Chuva", "🌧️"],
  storm: ["Tempestade", "⛈️"], snow: ["Neve", "❄️"]
});
export const WEATHER_MODES = {off: "Desligado", auto: "Automático", manual: "Manual", hold: "Manter clima atual"};
const mod = (n, d) => ((n % d) + d) % d;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const number = (v, fallback, min, max) => clamp(v !== "" && v !== null && Number.isFinite(Number(v)) ? Number(v) : fallback, min, max);
const bool = v => v === true || v === "true" || v === "on";
const choice = (v, choices, fallback) => Object.hasOwn(choices, v) ? v : fallback;

export function normalizeClimate(data = {}) {
  data = data && typeof data === "object" ? data : {};
  return {
    ...normalizeLunar(data),
    biome: choice(data.biome, BIOMES, "plains"), mode: choice(data.mode, WEATHER_MODES, "off"),
    altitude: number(data.altitude, 0, -500, 9000), coastal: bool(data.coastal), tides: bool(data.tides),
    visualEffects: bool(data.visualEffects),
    region: String(data.region ?? "").trim().slice(0, 80),
    condition: choice(data.condition, CONDITIONS, "clear"),
    temperature: number(data.temperature, 20, -80, 65), wind: number(data.wind, 5, 0, 150),
    tidePeriod: data.tidePeriodMinutes !== undefined
      ? number(data.tidePeriodMinutes, 745, 360, 1800) / 60 : number(data.tidePeriod, 12 + 25 / 60, 6, 30),
    tideHigh: number(data.tideHigh, 6, 0, 23.99), tideRange: number(data.tideRange, 1, 0.1, 10),
    hold: data.hold && Object.hasOwn(CONDITIONS, data.hold.condition) ? {
      condition: data.hold.condition, temperature: number(data.hold.temperature, 20, -80, 65),
      wind: number(data.hold.wind, 5, 0, 150)
    } : null
  };
}

function random(key) {
  let hash = 2166136261;
  for (const c of key) { hash ^= c.codePointAt(0); hash = Math.imul(hash, 16777619); }
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13; hash = Math.imul(hash, 0xc2b2ae35); hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
function noise(key, position) {
  const block = Math.floor(position), t = position - block;
  const smooth = t * t * (3 - 2 * t);
  return random(`${key}:${block}`) * (1 - smooth) + random(`${key}:${block + 1}`) * smooth;
}

export function weatherState({config = {}, latitude = 0, absoluteDay = 0, secondsToday = 0, sceneId = "scene"} = {}) {
  const c = normalizeClimate(config);
  if (c.mode === "off" || c.biome === "interior") return null;
  if (c.mode === "manual" || (c.mode === "hold" && c.hold)) {
    return describeWeather(c.mode === "hold" ? c.hold : c, c.mode);
  }
  const lat = number(latitude, 0, -90, 90);
  const day = number(absoluteDay, 0, -1e8, 1e8);
  const hour = mod(number(secondsToday, 0, -1e15, 1e15), 86400) / 3600;
  const time = day * 24 + hour;
  const biome = BIOMES[c.biome];
  const seed = c.region || sceneId;
  const season = solarDeclination(mod(day, 361)) / 23.44 * (lat < 0 ? -1 : 1);
  const wet = noise(`${seed}:wet`, time / 6);
  const front = noise(`${seed}:temperature`, time / 24);
  const moisture = clamp(biome.moisture + (c.coastal ? 0.1 : 0) + season * 0.08, 0, 1);
  const temperature = clamp(28 - Math.abs(lat) * 0.58 + biome.offset - c.altitude * 0.006
    + season * Math.abs(lat) * 0.22 + (front - 0.5) * 8
    + Math.cos((hour - 15) * Math.PI / 12) * biome.daily * (c.coastal ? 0.65 : 1), -80, 65);
  const threshold = 0.93 - moisture * 0.5;
  const precipitation = clamp((wet - threshold) / (1 - threshold), 0, 1);
  const wind = clamp(noise(`${seed}:wind`, time / 8) * (biome.wind ?? (c.biome === "mountain" ? 30 : 18))
    + precipitation * 40 + (c.coastal ? 4 : 0), 0, 150);
  let condition;
  if (precipitation > 0 && temperature <= 1) condition = "snow";
  else if (precipitation > 0.7) condition = "storm";
  else if (precipitation > 0.3) condition = "rain";
  else if (precipitation > 0) condition = "drizzle";
  else if (moisture > 0.6 && hour >= 4 && hour < 9 && wind < 10 && wet > 0.3) condition = "fog";
  else if (wet > threshold - 0.12) condition = "overcast";
  else if (wet > 0.24) condition = "cloudy";
  else condition = "clear";
  return describeWeather({condition, temperature, wind}, "auto");
}

function describeWeather({condition, temperature, wind}, mode) {
  const [label, icon] = CONDITIONS[condition];
  const t = Math.round(temperature), w = Math.round(wind);
  const windLabel = w < 3 ? "Calmo" : w < 15 ? "Vento fraco" : w < 35 ? "Vento moderado" : "Vento forte";
  return {condition, temperature: t, wind: w, mode, label, icon,
    text: `${icon} ${label} · ${t} °C · ${windLabel}`,
    detail: `${WEATHER_MODES[mode]} · Vento: ${w} km/h · Simulação de ambientação; sem efeitos mecânicos.`};
}

export function tideState({config = {}, absoluteDay = 0, lunarDay = absoluteDay, secondsToday = 0} = {}) {
  const c = normalizeClimate(config);
  if (!c.coastal || !c.tides || c.biome === "interior") return null;
  return lunarTideState({config:c,absoluteDay:lunarDay,secondsToday});
}

export function environmentInfo(scene, date, worldTime) {
  const config = normalizeClimate(scene?.getFlag("tagmar-calendario", "climate"));
  const args = {config, absoluteDay: date.absoluteDay, lunarDay: lunarCalendarDay(date), secondsToday: worldTime, sceneId: scene?.id,
    latitude: scene?.getFlag("tagmar-calendario", "dayNight")?.latitude ?? 0};
  const weather = weatherState(args), tide = tideState(args);
  return {weather, tide, rows: Number(Boolean(weather)) + Number(Boolean(tide))};
}
