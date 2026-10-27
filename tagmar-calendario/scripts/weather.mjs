import {solarDeclination} from "./daylight.mjs";
import {magicWeatherState, durationLabel} from './magic-weather.mjs';
import {isIndoor} from './scene-preset.mjs';
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
export const WIND_DIRECTIONS = Object.freeze({0:'N — Norte',45:'NE — Nordeste',90:'L — Leste',135:'SE — Sudeste',180:'S — Sul',225:'SO — Sudoeste',270:'O — Oeste',315:'NO — Noroeste'});
const mod = (n, d) => ((n % d) + d) % d;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const number = (v, fallback, min, max) => clamp(v !== "" && v !== null && Number.isFinite(Number(v)) ? Number(v) : fallback, min, max);
const bool = v => v === true || v === "true" || v === "on";
const choice = (v, choices, fallback) => Object.hasOwn(choices, v) ? v : fallback;
const bearing = (v,fallback=null) => v!==null && v!=='' && Number.isFinite(Number(v)) ? mod(Number(v),360) : fallback;

export function normalizeClimate(data = {}) {
  data = data && typeof data === "object" ? data : {};
  return {
    ...normalizeLunar(data),
    biome: choice(data.biome, BIOMES, "plains"), mode: choice(data.mode, WEATHER_MODES, "auto"),
    indoor:isIndoor(data),
    altitude: number(data.altitude, 0, -500, 9000), coastal: bool(data.coastal), tides: data.tides === undefined ? true : bool(data.tides),
    visualEffects: data.visualEffects === undefined ? true : bool(data.visualEffects),
    region: String(data.region ?? "").trim().slice(0, 80),
    condition: choice(data.condition, CONDITIONS, "clear"),
    temperature: number(data.temperature, 20, -80, 65), wind: number(data.wind, 5, 0, 150),
    windDirection: bearing(data.windDirection,0),
    tidePeriod: data.tidePeriodMinutes !== undefined
      ? number(data.tidePeriodMinutes, 745, 360, 1800) / 60 : number(data.tidePeriod, 12 + 25 / 60, 6, 30),
    tideHigh: number(data.tideHigh, 6, 0, 23.99), tideRange: number(data.tideRange, 1, 0.1, 10),
    hold: data.hold && Object.hasOwn(CONDITIONS, data.hold.condition) ? {
      condition: data.hold.condition, temperature: number(data.hold.temperature, 20, -80, 65),
      wind: number(data.hold.wind, 5, 0, 150), windDirection: bearing(data.hold.windDirection)
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

// Direção DE ONDE vem o vento: 0° N, 90° L. Interpolação circular pelo
// menor arco evita uma volta artificial completa na passagem 359° → 0°.
export function windDirectionAt(seed,time) {
  const position=time/8,block=Math.floor(position),t=position-block;
  const from=random(`${seed}:wind-direction:${block}`)*360;
  const to=random(`${seed}:wind-direction:${block+1}`)*360;
  const delta=mod(to-from+180,360)-180;
  return mod(from+delta*t*t*(3-2*t),360);
}

export function weatherState({config = {}, latitude = 0, absoluteDay = 0, secondsToday = 0, sceneId = "scene"} = {}) {
  const c = normalizeClimate(config);
  if (c.mode === "off" || c.indoor) return null;
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
  return describeWeather({condition, temperature, wind,windDirection:windDirectionAt(seed,time)}, "auto");
}

function describeWeather({condition, temperature, wind,windDirection}, mode) {
  const [label, icon] = CONDITIONS[condition];
  const t = Math.round(temperature), w = Math.round(wind);
  const windLabel = w < 3 ? "Calmo" : w < 15 ? "Vento fraco" : w < 35 ? "Vento moderado" : "Vento forte";
  const degrees=w===0?null:bearing(windDirection);
  const directionLabel=degrees===null?null:WIND_DIRECTIONS[(Math.round(degrees/45)%8)*45];
  const direction=directionLabel?.split(' — ')[0]??null;
  const windText=w===0?'Vento 0 km/h (calmo)':`Vento ${w} km/h${direction?` de ${direction}`:''}`;
  return {condition, temperature: t, wind: w, windDirection:degrees,windDirectionLabel:directionLabel,windText,mode, label, icon,
    text: `${icon} ${label} · ${t} °C · ${windText}`,
    detail: `${WEATHER_MODES[mode]} · ${windLabel}: ${w} km/h · ${degrees===null?(w===0?'Sem direção com vento zero':'Direção não registrada no clima mantido'):`Vindo de ${directionLabel} (${Math.round(degrees)%360}°)`}. Simulação de ambientação; sem efeitos mecânicos nem mudança na direção das partículas nativas.`};
}

export function tideState({config = {}, absoluteDay = 0, lunarDay = absoluteDay, secondsToday = 0} = {}) {
  const c = normalizeClimate(config);
  if (!c.tides || c.indoor) return null;
  return lunarTideState({config:c,absoluteDay:lunarDay,secondsToday});
}

export function adventureRegion(world) {
  return String(world?.title || world?.id || 'Aventura').trim().slice(0,80) || 'Aventura';
}

// HUD reference is independent from scene-effect switches. No writes here.
export function environmentInfo(scene, date, worldTime, world, settings = {}) {
  const saved = normalizeClimate(scene?.getFlag("tagmar-calendario", "climate"));
  const config = {...saved,region:adventureRegion(world),indoor:false,tides:true,
    biome:saved.biome==='interior'?'plains':saved.biome,mode:saved.mode==='off'?'auto':saved.mode};
  const args = {config, absoluteDay: date.absoluteDay, lunarDay: lunarCalendarDay(date), secondsToday: worldTime, sceneId: scene?.id,
    latitude: scene?.getFlag("tagmar-calendario", "dayNight")?.latitude ?? 0};
  const magic = magicWeatherState(scene, date, worldTime);
  const weather = settings.weatherEnabled === false ? null : magic.active
    ? weatherState({...args, config: {...config, ...magic.magic.weather, mode:'manual'}})
    : weatherState({...args, absoluteDay:magic.absoluteDay, secondsToday:magic.secondsToday});
  if (weather && magic.active) {
    weather.magic = true;
    weather.remaining = magic.remaining;
    weather.detail = `Clima alterado por magia · restam ${durationLabel(magic.remaining)} de jogo. ${weather.detail}`;
  }
  const tide = settings.tidesEnabled === false ? null : tideState(args);
  const reference=`Aventura: ${config.region}. Referência externa, independente dos efeitos aplicados no mapa.${!scene?' Sem cena ativa: campos, latitude 0°, altitude 0 m.':''}`;
  if(weather)weather.detail+=` ${reference}`;
  if(tide)tide.detail+=` ${reference}`;
  return {weather, tide, rows: Number(Boolean(weather)) + Number(Boolean(tide))};
}
