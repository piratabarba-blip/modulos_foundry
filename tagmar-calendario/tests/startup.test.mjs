import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {solarState, formatSolarHour, createDaylightSync} from "../scripts/daylight.mjs";

const source = fs.readFileSync(new URL("../scripts/calendar.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "");

function client({isGM = false, open = true, collapsed = false} = {}) {
  const hooks = new Map(), definitions = new Map(), values = new Map([
    ["openOnLogin", open], ["hudCollapsed", collapsed],
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
    game, console, solarState, formatSolarHour, createDaylightSync,
    foundry: {applications: {api: {ApplicationV2, HandlebarsApplicationMixin: c => c}}},
    Hooks: {
      once: (name, fn) => hooks.set(name, fn),
      on: (name, fn) => hooks.set(name, fn)
    },
    clearInterval() {}, setInterval(fn) { timers.push(fn); return 1; },
    ui: {notifications: {info() {}}}
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
  const gm = {...c.game.user, active: true};
  c.game.users = [gm];
  const scene = {
    environment: {darknessLevel: 0.3, darknessLock: false},
    config: {enabled: true, latitude: 0},
    getFlag() {return this.config;},
    async update(data, options) {
      sceneWrites.push(data);
      this.environment.darknessLevel = data["environment.darknessLevel"];
      c.hooks.get("updateScene")(this, data, options);
    }
  };
  c.game.scenes = {active: scene};
  c.game.time.worldTime = 43200;
  await c.module.api.syncDaylight();
  assert.equal(sceneWrites.length, 0, "Global default is disabled");
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
