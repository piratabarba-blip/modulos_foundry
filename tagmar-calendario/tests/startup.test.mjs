import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {solarState, formatSolarHour, createDaylightSync} from "../scripts/daylight.mjs";
import {environmentInfo} from "../scripts/weather.mjs";
import {createWeatherEffectsSync} from "../scripts/weather-effects.mjs";
import {createWeatherTransition} from "../scripts/weather-transition.mjs";
import {installWeatherLayerSwap} from "../scripts/weather-layer-swap.mjs";
import {MOONS, lunarSky, lunarCalendarDay} from "../scripts/lunar.mjs";
import {renderSceneEnvironment, prepareEnvironmentUpdate} from "../scripts/scene-environment.mjs";
import {normalizeDayNight, applyScenePreset} from '../scripts/scene-preset.mjs';

const source = fs.readFileSync(new URL("../scripts/calendar.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "");

function client({isGM = false, open = true, collapsed = false} = {}) {
  const hooks = new Map(), definitions = new Map(), values = new Map([
    ["openOnLogin", open], ["hudCollapsed", collapsed], ['scenePresetVersion',1],
    ["hudLeft", 55], ["hudTop", 80], ["hudWidth", 510], ["hudCollapsedWidth", 330]
  ]);
  const apps = [], writes = [], advances = [], timers = [];
  class ApplicationV2 {
    rendered = false;
    constructor() { apps.push(this); }
    render() { this.rendered = true; this.renders = (this.renders ?? 0) + 1; }
    close() { this.rendered = false; }
    async _prepareContext() { return {}; }
  }
  const module = {};
  const game = {
    user: {id: isGM ? "gm" : "player", isGM},
    modules: new Map([["tagmar-calendario", module]]),
    settings: {
      register(id, key, definition) {
        assert.equal(id, "tagmar-calendario"); definitions.set(key, definition);
        if (!values.has(key)) values.set(key, definition.default);
      },
      get: (_id, key) => values.get(key),
      set: async (_id, key, value) => { writes.push(key); values.set(key, value); }
    },
    time: {worldTime: 12345, advance: async seconds => advances.push(seconds)},
    socket: {on() {}}, users: []
  };
  vm.runInNewContext(source, {
    game, console, normalizeDayNight, applyScenePreset, solarState, formatSolarHour, createDaylightSync, createWeatherEffectsSync, createWeatherTransition, installWeatherLayerSwap, MOONS, lunarSky, lunarCalendarDay, environmentInfo, renderSceneEnvironment, prepareEnvironmentUpdate,
    CONFIG: {weatherEffects: {rain:{},rainStorm:{},fog:{},snow:{},blizzard:{},leaves:{}}},
    foundry: {applications: {api: {ApplicationV2, HandlebarsApplicationMixin: c => c}}},
    Hooks: {
      once: (name, fn) => hooks.set(name, fn),
      on: (name, fn) => hooks.set(name, fn)
    },
    clearInterval() {}, setInterval(fn) { timers.push(fn); return 1; },
    ui: {notifications: {info() {}, warn() {}}}
  });
  hooks.get("init")();
  const before = new Map(values);
  hooks.get("ready")();
  return {hooks, definitions, values, apps, writes, advances, timers, module, game, before};
}

for (const isGM of [false, true]) for (const collapsed of [false, true]) {
  const c = client({isGM, collapsed});
  const option = c.definitions.get("openOnLogin");
  assert.equal(option.default, true);
  assert.equal(option.scope, "world");
  assert.equal(option.restricted, true);
  assert.equal(option.config, true);
  assert.equal(c.apps.length, 1, "One window per client at startup");
  assert.equal(c.apps[0].rendered, true);
  assert.deepEqual(c.values, c.before, "Do not change saved geometry/date/playback");
  assert.equal(c.writes.length, 0);
  await c.timers[0]();
  assert.equal(c.advances.length, 0, "Startup must not start the clock");
  const context = await c.apps[0]._prepareContext({});
  assert.equal(context.canControl, isGM, "Keep GM-only time controls");
  assert.equal(context.collapsed, collapsed);
  c.hooks.get("updateWorldTime")();
  assert.equal(c.apps[0].renders, 2, "Open window refreshes");
  c.apps[0].close();
  c.game.time.worldTime += 1;
  c.hooks.get("updateWorldTime")();
  for (const key of ["epochOffset", "customEvents", "playbackRunning", "playbackRate", "hudCollapsed"]) {
    c.definitions.get(key).onChange();
  }
  assert.equal(c.apps[0].renders, 2, "Closed window stays closed during updates");
  c.module.api.open();
  assert.equal(c.apps.length, 1, "Manual opening reuses the window");
  assert.equal(c.apps[0].rendered, true);
  const nextLogin = client({isGM, collapsed});
  assert.equal(nextLogin.apps[0].rendered, true, "Next login opens independently");
}
for (const isGM of [false, true]) {
  const c = client({isGM, open: false});
  assert.equal(c.apps.length, 0, "Disabled option skips startup");
  c.hooks.get("updateWorldTime")();
  assert.equal(c.apps.length, 0);
  const controls = {tokens: {tools: {}}};
  c.hooks.get("getSceneControlButtons")(controls);
  controls.tokens.tools["tagmar-calendario"].onChange();
  assert.equal(c.apps[0].rendered, true, "Menu still works when auto-open is off");
}
console.log("PASS: GM/player startup, disabled option, manual close/reopen, saved HUD, permissions and paused clock.");

// Integração dos hooks reais com a fila de iluminação e o relógio.
{
  const c = client({isGM: true, open: false});
  const sceneWrites = [];
  c.values.set('dayNightEnabled',false);
  const gm = {...c.game.user, active: true};
  c.game.users = [gm];
  const scene = {
    environment: {darknessLevel: 0.3, darknessLock: false},
    config: {enabled: true, latitude: 0},
    getFlag(_id,key) {return key==='climate'?{mode:'off',visualEffects:false,tides:false}:this.config;},
    async update(data, options) {
      sceneWrites.push(data);
      this.environment.darknessLevel = data["environment.darknessLevel"];
      c.hooks.get("updateScene")(this, data, options);
    }
  };
  c.game.scenes = {active: scene};
  c.game.time.worldTime = 43200;
  await c.module.api.syncDaylight();
  assert.equal(sceneWrites.length, 0, "Explicit global disable respected");
  c.values.set("dayNightEnabled", true);
  c.definitions.get("dayNightEnabled").onChange();
  await c.module.api.syncDaylight();
  assert.equal(sceneWrites.length, 1);
  assert.equal(scene.environment.darknessLevel, 0);
  c.game.time.worldTime = 0;
  c.hooks.get("updateWorldTime")();
  await c.module.api.syncDaylight();
  assert.equal(scene.environment.darknessLevel, 0.85);
  assert.equal(c.apps.length, 0, "Lighting does not open a closed HUD");
  scene.environment.darknessLock = true;
  c.game.time.worldTime = 43200;
  c.hooks.get("canvasReady")();
  await c.module.api.syncDaylight();
  assert.equal(scene.environment.darknessLevel, 0.85);
  scene.environment.darknessLock = false;
  c.hooks.get("updateScene")(scene, {environment: {darknessLock: false}}, {});
  await c.module.api.syncDaylight();
  assert.equal(scene.environment.darknessLevel, 0);
  scene.config.latitude = 30;
  c.game.time.worldTime = 6 * 3600;
  c.values.set("epochOffset", 44);
  c.definitions.get("epochOffset").onChange();
  await c.module.api.syncDaylight();
  const summer = scene.environment.darknessLevel;
  c.values.set("epochOffset", 224);
  c.definitions.get("epochOffset").onChange();
  await c.module.api.syncDaylight();
  assert.ok(scene.environment.darknessLevel > summer, "Date picker offset changes season");
  c.values.set("playbackRunning", true);
  await c.timers[0]();
  assert.equal(c.advances.length, 1);
  c.game.users.push({id: "aaa", isGM: true, active: true});
  await c.timers[0]();
  assert.equal(c.advances.length, 1, "Only the elected GM advances the clock");
  c.game.users[1].active = false;
  await c.timers[0]();
  assert.equal(c.advances.length, 2, "Remaining GM takes over");
}
{
  const c = client({isGM: false, open: false});
  await c.module.api.configureDaylight();
  assert.equal(c.writes.length, 0, "Players cannot configure lighting via API");
}
console.log("PASS: real calendar hooks, active scene sync, date offset, lock/unlock, two-GM clock and player API guard.");

for(const isGM of [false,true]) {
  const c=client({isGM});
  const flags={climate:{mode:"auto",biome:"tropical",coastal:true,tides:true,region:"Calco"},dayNight:{latitude:0,enabled:true}};
  c.game.scenes={active:{id:"calco",getFlag:(_id,key)=>flags[key]}};
  const data=await c.apps[0]._prepareContext({});
  assert.equal(data.environment.rows,2);
  assert.deepEqual(data.environment,c.module.api.getEnvironmentInfo());
  if(!isGM) await c.module.api.configureEnvironment();
  flags.climate.biome="interior";
  const inside=await c.apps[0]._prepareContext({});
  assert.equal(inside.environment.rows,2);
  assert.equal(inside.solar.enabled,true);
  assert.equal(c.writes.length,0,"Climate calculation never writes world settings");
}
console.log("PASS: climate HUD on GM/player clients, independent rows, interior exclusion, read-only calculation.");

const lunarClients=[];
for (const isGM of [false,true]) {
  const c=client({isGM});
  const setting=c.definitions.get('moonSky');
  assert.equal(setting.default,false);
  assert.equal(setting.scope,'world');
  assert.equal(setting.restricted,true);
  const flags={climate:{coastal:true,tides:true,tideModel:'lunar'}};
  c.game.scenes={active:{id:'coast',getFlag:(_id,key)=>flags[key]}};
  c.game.time.worldTime=6*3600;
  const before=await c.apps[0]._prepareContext({});
  assert.equal(before.moonSky,false);
  c.values.set('moonSky',true);
  setting.onChange();
  const enabled=await c.apps[0]._prepareContext({});
  c.game.time.worldTime+=3600;
  const after=await c.apps[0]._prepareContext({});
  assert.equal(after.moonSky,true);
  for (const key of Object.keys(MOONS)) {
    assert.ok(after[key].progress>enabled[key].progress,'Enabled phases advance continuously within the day');
    assert.notEqual(after[key].sky.progress,enabled[key].sky.progress,'Sky position advances hourly');
  }
  c.values.set('moonSky',false);
  const restored=await c.apps[0]._prepareContext({});
  for (const key of Object.keys(MOONS)) assert.equal(restored[key].progress,after[key].progress,'Changing wheel mode cannot change lunar phase');
  assert.equal(c.writes.length,0,'Lunar display never writes world settings');
  assert.equal(c.advances.length,0);
  lunarClients.push(JSON.stringify({agmarim:after.agmarim,environment:after.environment}));
}
assert.equal(lunarClients[0],lunarClients[1],'GM and player compute identical lunar data');
console.log('PASS: opt-in orbital sky, continuous phases in both wheel modes and GM/player agreement.');

for (const isGM of [false,true]) {
  const c=client({isGM});
  c.values.set('moonSky',true);
  const flags={climate:{tides:true,coastal:true,tideModel:'lunar',tideRange:3}};
  c.game.scenes={active:{id:'anchor',getFlag:(_id,key)=>flags[key]}};
  let reference;
  for (const [epochYear,worldDays,offset] of [[1500,360,0],[1499,721,0],[1501,-1,0],[1500,20,340]]) {
    c.values.set('epochYear',epochYear);c.values.set('epochOffset',offset);
    c.game.time.worldTime=worldDays*86400;
    const date=c.module.api.getDate();
    assert.equal(date.year,1500);assert.equal(date.isCruine,true);assert.equal(date.lunarDay,360);
    for (const key of Object.keys(MOONS)) {
      assert.equal(date[key].name,'Cheia');assert.equal(date[key].progress,0.5);
      assert.equal(date[key].sky.progress,0);assert.equal(date[key].sky.above,true);
    }
    const tide=c.module.api.getEnvironmentInfo().tide;
    assert.ok(Math.abs(tide.height-3)<1e-9);assert.equal(tide.label,'Maré alta');
    const state=JSON.stringify([date.agmarim,date.armina,date.denegria,tide]);
    if(reference) assert.equal(state,reference,'Same civil date has same moons/tides regardless of world epoch or offset');
    reference=state;
    c.game.time.worldTime+=86400;
    const next=c.module.api.getDate();assert.equal(next.year,1501);assert.equal(next.day,1);
    assert.equal(next.lunarDay,361);assert.notEqual(next.agmarim.progress,0.5);
  }
  assert.equal(c.writes.length,0);assert.equal(c.advances.length,0);
}
console.log('PASS: Cruine 1500 midnight alignment, full moons, matching tide, next-year continuity and epoch independence.');

for (const isGM of [false,true]) {
  const c=client({isGM,open:false});
  assert.equal(c.definitions.get('weatherFadeSeconds').default,3);
  c.values.set('dayNightEnabled',false); // Isolate weather writes; light defaults covered separately.
  c.values.set('weatherFadeSeconds',0); // Fila de fade testada separadamente com relógio controlado.
  c.game.users=[{id:c.game.user.id,isGM,active:true}];
  const flags={climate:{visualEffects:true,mode:'manual',condition:'rain'}};
  const writes=[];
  const scene={id:'outdoors',weather:'leaves',getFlag:(_id,key)=>flags[key],async update(data,options) {
    writes.push(data);
    if ('weather' in data) this.weather=data.weather;
    if ('flags.tagmar-calendario.weatherVisualState' in data) flags.weatherVisualState=data['flags.tagmar-calendario.weatherVisualState'];
    if ('flags.tagmar-calendario.-=weatherVisualState' in data) delete flags.weatherVisualState;
    c.hooks.get('updateScene')(this,data,options);
  }};
  c.game.scenes={active:scene};
  c.hooks.get('canvasReady')(); await c.module.api.syncWeatherEffects();
  assert.equal(scene.weather,isGM?'rain':'leaves');
  flags.climate.condition='storm';
  c.hooks.get('updateWorldTime')(); await c.module.api.syncWeatherEffects();
  assert.equal(scene.weather,isGM?'rainStorm':'leaves');
  flags.climate.condition='snow';
  c.definitions.get('epochOffset').onChange(); await c.module.api.syncWeatherEffects();
  assert.equal(scene.weather,isGM?'snow':'leaves');
  flags.climate.visualEffects=false;
  c.hooks.get('updateScene')(scene,{flags:{'tagmar-calendario':{climate:flags.climate}}},{});
  await c.module.api.syncWeatherEffects();
  assert.equal(scene.weather,'leaves');
  assert.equal(writes.length,isGM?4:0,'No hook loops or player writes');
  assert.equal(c.apps.length,0,'Visual sync does not open HUD');
}
console.log('PASS: native weather integration through actual calendar hooks, flags, time, date, GM/player guard and restoration.');
